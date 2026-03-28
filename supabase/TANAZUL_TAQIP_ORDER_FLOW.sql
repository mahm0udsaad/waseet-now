-- Tanazul/Taqip service-order flow (escrow-style lifecycle)
-- Idempotent migration helpers for custom `public.orders` schema used by mobile app.
-- Safe to run multiple times.

-- 1) Add lifecycle/payment fields if missing.
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS transfer_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS transfer_phone TEXT,
  ADD COLUMN IF NOT EXISTS transfer_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_progress_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- 2) Optional status check update if legacy check constraint exists.
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname
  INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'orders'
    AND con.contype = 'c'
    AND (
      con.conname = 'orders_status_check'
      OR pg_get_constraintdef(con.oid) ~* '(^|[^a-z_])status([^a-z_]|$)'
    )
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_check
      CHECK (
        status IN (
          'awaiting_payment',
          'payment_submitted',
          'awaiting_admin_transfer_approval',
          'payment_verified',
          'in_progress',
          'completion_requested',
          'completed',
          'disputed',
          'cancelled',
          'refunded',
          -- legacy values accepted during migration window
          'pending_payment',
          'paid'
        )
      );
  END IF;
END $$;

-- 3) Generic transition helper for tanazul/taqip service orders.
CREATE OR REPLACE FUNCTION public.transition_service_order_status(
  p_order_id UUID,
  p_new_status TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Allowed transitions (minimal strict graph)
  IF NOT (
    (v_order.status IN ('awaiting_payment', 'pending_payment') AND p_new_status IN ('payment_submitted', 'awaiting_admin_transfer_approval', 'payment_verified')) OR
    (v_order.status = 'payment_submitted' AND p_new_status IN ('awaiting_admin_transfer_approval', 'awaiting_payment')) OR
    (v_order.status = 'awaiting_admin_transfer_approval' AND p_new_status IN ('payment_verified', 'awaiting_payment')) OR
    (v_order.status IN ('payment_verified', 'paid') AND p_new_status IN ('in_progress', 'completion_requested', 'completed', 'disputed', 'cancelled')) OR
    (v_order.status = 'in_progress' AND p_new_status IN ('completion_requested', 'completed', 'disputed', 'cancelled')) OR
    (v_order.status = 'completion_requested' AND p_new_status IN ('completed', 'disputed', 'cancelled')) OR
    (v_order.status = 'completed' AND p_new_status IN ('refunded'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_order.status, p_new_status;
  END IF;

  UPDATE public.orders
  SET
    status = p_new_status,
    payment_verified_at = CASE WHEN p_new_status = 'payment_verified' THEN COALESCE(payment_verified_at, NOW()) ELSE payment_verified_at END,
    in_progress_at = CASE WHEN p_new_status = 'in_progress' THEN COALESCE(in_progress_at, NOW()) ELSE in_progress_at END,
    completion_requested_at = CASE WHEN p_new_status = 'completion_requested' THEN COALESCE(completion_requested_at, NOW()) ELSE completion_requested_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
    escrow_released_at = CASE WHEN p_new_status = 'completed' THEN COALESCE(escrow_released_at, NOW()) ELSE escrow_released_at END,
    refunded_at = CASE WHEN p_new_status = 'refunded' THEN COALESCE(refunded_at, NOW()) ELSE refunded_at END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- 4) RPC: buyer submits bank transfer proof.
CREATE OR REPLACE FUNCTION public.submit_service_bank_transfer(
  p_order_id UUID,
  p_transfer_receipt_url TEXT DEFAULT NULL,
  p_transfer_phone TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_order.buyer_id THEN
    RAISE EXCEPTION 'Only buyer can submit transfer proof';
  END IF;

  UPDATE public.orders
  SET
    payment_method = 'bank_transfer',
    transfer_receipt_url = COALESCE(p_transfer_receipt_url, transfer_receipt_url),
    transfer_phone = COALESCE(p_transfer_phone, transfer_phone),
    transfer_submitted_at = COALESCE(transfer_submitted_at, NOW()),
    status = 'awaiting_admin_transfer_approval',
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- 5) RPC: admin approves bank transfer.
CREATE OR REPLACE FUNCTION public.approve_service_bank_transfer(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'awaiting_admin_transfer_approval' THEN
    RAISE EXCEPTION 'Order is not waiting admin transfer approval';
  END IF;

  UPDATE public.orders
  SET
    transfer_approved_at = COALESCE(transfer_approved_at, NOW()),
    payment_verified_at = COALESCE(payment_verified_at, NOW()),
    status = 'payment_verified',
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- 6) RPC: admin rejects bank transfer.
CREATE OR REPLACE FUNCTION public.reject_service_bank_transfer(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'awaiting_admin_transfer_approval' THEN
    RAISE EXCEPTION 'Order is not waiting admin transfer approval';
  END IF;

  UPDATE public.orders
  SET
    transfer_rejected_at = COALESCE(transfer_rejected_at, NOW()),
    transfer_rejected_reason = p_reason,
    status = 'awaiting_payment',
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- 7) RPC: buyer confirms service was received.
CREATE OR REPLACE FUNCTION public.confirm_service_received(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_order.buyer_id THEN
    RAISE EXCEPTION 'Only buyer can confirm service receipt';
  END IF;

  IF v_order.status NOT IN ('payment_verified', 'in_progress', 'completion_requested', 'paid') THEN
    RAISE EXCEPTION 'Order is not ready for completion confirmation';
  END IF;

  UPDATE public.orders
  SET
    buyer_confirmed_received_at = COALESCE(buyer_confirmed_received_at, NOW()),
    completion_requested_at = COALESCE(completion_requested_at, NOW()),
    completed_at = COALESCE(completed_at, NOW()),
    escrow_released_at = COALESCE(escrow_released_at, NOW()),
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;
