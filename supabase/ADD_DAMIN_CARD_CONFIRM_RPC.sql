-- Server-authoritative confirmation for successful Damin card payments.
-- Idempotent and safe to run multiple times.

CREATE OR REPLACE FUNCTION public.confirm_damin_card_payment(order_id UUID)
RETURNS public.damin_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order public.damin_orders;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
    INTO v_order
  FROM public.damin_orders
  WHERE id = order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Damin order not found';
  END IF;

  -- Only payer side can confirm card payment.
  IF v_uid IS DISTINCT FROM v_order.creator_id
     AND v_uid IS DISTINCT FROM v_order.payer_user_id THEN
    RAISE EXCEPTION 'Only payer can confirm card payment';
  END IF;

  -- Idempotent success path.
  IF v_order.status = 'awaiting_completion' AND v_order.escrow_deposit_at IS NOT NULL THEN
    RETURN v_order;
  END IF;

  -- Valid pre-payment statuses for card confirmation.
  IF v_order.status NOT IN ('both_confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Order status % is not eligible for card payment confirmation', v_order.status;
  END IF;

  UPDATE public.damin_orders
  SET
    status = 'awaiting_completion',
    escrow_deposit_at = COALESCE(escrow_deposit_at, NOW()),
    updated_at = NOW()
  WHERE id = order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_damin_card_payment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_damin_card_payment(UUID) TO authenticated;
