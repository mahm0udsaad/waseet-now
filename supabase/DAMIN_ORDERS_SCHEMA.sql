-- Damin Orders Schema
-- This schema supports the complete Damin (ضامن) service workflow
-- with dual-party confirmation and escrow management

-- Create damin_orders table
CREATE TABLE IF NOT EXISTS public.damin_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Creator & Service Details
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type_or_details TEXT NOT NULL,
  service_period_start TEXT,
  completion_days INTEGER,
  
  -- Party Information
  payer_phone TEXT NOT NULL,
  payer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payer_confirmed_at TIMESTAMPTZ,
  
  beneficiary_phone TEXT NOT NULL,
  beneficiary_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  beneficiary_confirmed_at TIMESTAMPTZ,
  
  -- Financial Details
  service_value NUMERIC(12,2) NOT NULL,
  commission NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.0, -- Fixed 10%
  
  -- State Management
  -- States: 'created' → 'pending_confirmations' → 'escrow_deposit' → 'awaiting_completion' → 'completed' / 'disputed' / 'cancelled'
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN (
      'created',
      'pending_confirmations',
      'both_confirmed',
      'escrow_deposit',
      'awaiting_completion',
      'completed',
      'disputed',
      'cancelled'
    )
  ),
  
  -- Terms & Conditions
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT DEFAULT '1.0',
  
  -- Additional Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Payment & Escrow
  payment_link TEXT,
  escrow_deposit_at TIMESTAMPTZ,
  escrow_released_at TIMESTAMPTZ,
  
  -- Completion & Dispute
  completion_confirmed_by_payer_at TIMESTAMPTZ,
  completion_confirmed_by_beneficiary_at TIMESTAMPTZ,
  dispute_reason TEXT,
  disputed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS damin_orders_creator_id_idx ON public.damin_orders(creator_id);
CREATE INDEX IF NOT EXISTS damin_orders_payer_phone_idx ON public.damin_orders(payer_phone);
CREATE INDEX IF NOT EXISTS damin_orders_beneficiary_phone_idx ON public.damin_orders(beneficiary_phone);
CREATE INDEX IF NOT EXISTS damin_orders_payer_user_id_idx ON public.damin_orders(payer_user_id);
CREATE INDEX IF NOT EXISTS damin_orders_beneficiary_user_id_idx ON public.damin_orders(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS damin_orders_status_idx ON public.damin_orders(status);
CREATE INDEX IF NOT EXISTS damin_orders_created_at_idx ON public.damin_orders(created_at DESC);

-- Composite index for pending orders by phone
CREATE INDEX IF NOT EXISTS damin_orders_pending_by_phone_idx 
  ON public.damin_orders(payer_phone, beneficiary_phone, status) 
  WHERE status IN ('created', 'pending_confirmations', 'both_confirmed');

-- Updated at trigger
DROP TRIGGER IF EXISTS damin_orders_set_updated_at ON public.damin_orders;
CREATE TRIGGER damin_orders_set_updated_at
  BEFORE UPDATE ON public.damin_orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.damin_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Creator can always see their own orders
DROP POLICY IF EXISTS "Creators can view their damin orders" ON public.damin_orders;
CREATE POLICY "Creators can view their damin orders" ON public.damin_orders
  FOR SELECT USING (auth.uid() = creator_id);

-- 2. Creator can insert orders
DROP POLICY IF EXISTS "Creators can create damin orders" ON public.damin_orders;
CREATE POLICY "Creators can create damin orders" ON public.damin_orders
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 3. Creator can update their own orders
DROP POLICY IF EXISTS "Creators can update their damin orders" ON public.damin_orders;
CREATE POLICY "Creators can update their damin orders" ON public.damin_orders
  FOR UPDATE USING (auth.uid() = creator_id);

-- 4. Parties can view orders they're involved in (by user_id)
DROP POLICY IF EXISTS "Parties can view their damin orders" ON public.damin_orders;
CREATE POLICY "Parties can view their damin orders" ON public.damin_orders
  FOR SELECT USING (
    auth.uid() = payer_user_id OR 
    auth.uid() = beneficiary_user_id
  );

-- 5. Parties can update confirmation status
DROP POLICY IF EXISTS "Parties can confirm damin orders" ON public.damin_orders;
CREATE POLICY "Parties can confirm damin orders" ON public.damin_orders
  FOR UPDATE USING (
    auth.uid() = payer_user_id OR 
    auth.uid() = beneficiary_user_id
  );

-- Helper function: Find pending damin orders for a phone number
CREATE OR REPLACE FUNCTION public.find_pending_damin_orders_by_phone(phone_number TEXT)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  service_type_or_details TEXT,
  payer_phone TEXT,
  beneficiary_phone TEXT,
  total_amount NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  user_role TEXT,
  needs_confirmation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dord.id,
    dord.creator_id,
    dord.service_type_or_details,
    dord.payer_phone,
    dord.beneficiary_phone,
    dord.total_amount,
    dord.status,
    dord.created_at,
    CASE 
      WHEN dord.payer_phone = phone_number THEN 'payer'
      WHEN dord.beneficiary_phone = phone_number THEN 'beneficiary'
      ELSE 'unknown'
    END as user_role,
    CASE
      WHEN dord.payer_phone = phone_number AND dord.payer_confirmed_at IS NULL THEN true
      WHEN dord.beneficiary_phone = phone_number AND dord.beneficiary_confirmed_at IS NULL THEN true
      ELSE false
    END as needs_confirmation
  FROM public.damin_orders dord
  WHERE 
    (dord.payer_phone = phone_number OR dord.beneficiary_phone = phone_number)
    AND dord.status IN ('created', 'pending_confirmations', 'both_confirmed')
  ORDER BY dord.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.find_pending_damin_orders_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_pending_damin_orders_by_phone(TEXT) TO authenticated;

-- Helper function: Link user to damin order by phone
CREATE OR REPLACE FUNCTION public.link_user_to_damin_order(order_id UUID, user_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update payer_user_id if phone matches and not already set
  UPDATE public.damin_orders
  SET payer_user_id = current_user_id
  WHERE id = order_id 
    AND payer_phone = user_phone
    AND payer_user_id IS NULL;

  -- Update beneficiary_user_id if phone matches and not already set
  UPDATE public.damin_orders
  SET beneficiary_user_id = current_user_id
  WHERE id = order_id 
    AND beneficiary_phone = user_phone
    AND beneficiary_user_id IS NULL;

  RETURN true;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.link_user_to_damin_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_user_to_damin_order(UUID, TEXT) TO authenticated;

-- Helper function: Confirm damin order participation
CREATE OR REPLACE FUNCTION public.confirm_damin_order_participation(order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  order_record RECORD;
  new_status TEXT;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get order details
  SELECT * INTO order_record
  FROM public.damin_orders
  WHERE id = order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Determine user role and update confirmation
  IF order_record.payer_user_id = current_user_id THEN
    UPDATE public.damin_orders
    SET payer_confirmed_at = NOW()
    WHERE id = order_id AND payer_confirmed_at IS NULL;
  ELSIF order_record.beneficiary_user_id = current_user_id THEN
    UPDATE public.damin_orders
    SET beneficiary_confirmed_at = NOW()
    WHERE id = order_id AND beneficiary_confirmed_at IS NULL;
  ELSE
    RAISE EXCEPTION 'User is not authorized to confirm this order';
  END IF;

  -- Check if both parties confirmed and update status
  SELECT * INTO order_record FROM public.damin_orders WHERE id = order_id;
  
  IF order_record.payer_confirmed_at IS NOT NULL AND order_record.beneficiary_confirmed_at IS NOT NULL THEN
    new_status := 'both_confirmed';
    
    UPDATE public.damin_orders
    SET status = new_status
    WHERE id = order_id;
  ELSE
    new_status := 'pending_confirmations';
    
    UPDATE public.damin_orders
    SET status = new_status
    WHERE id = order_id AND status = 'created';
  END IF;

  result := jsonb_build_object(
    'success', true,
    'order_id', order_id,
    'new_status', new_status,
    'both_confirmed', (order_record.payer_confirmed_at IS NOT NULL AND order_record.beneficiary_confirmed_at IS NOT NULL)
  );

  RETURN result;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.confirm_damin_order_participation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_damin_order_participation(UUID) TO authenticated;

-- Helper function: Reject damin order participation
CREATE OR REPLACE FUNCTION public.reject_damin_order_participation(order_id UUID, rejection_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  order_record RECORD;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get order details
  SELECT * INTO order_record
  FROM public.damin_orders
  WHERE id = order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if user is authorized
  IF order_record.payer_user_id != current_user_id AND order_record.beneficiary_user_id != current_user_id THEN
    RAISE EXCEPTION 'User is not authorized to reject this order';
  END IF;

  -- Update order status to cancelled
  UPDATE public.damin_orders
  SET 
    status = 'cancelled',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{rejection_reason}',
      to_jsonb(rejection_reason)
    ),
    metadata = jsonb_set(
      metadata,
      '{rejected_by_user_id}',
      to_jsonb(current_user_id::text)
    )
  WHERE id = order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', order_id,
    'status', 'cancelled'
  );
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.reject_damin_order_participation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_damin_order_participation(UUID, TEXT) TO authenticated;

-- Notification function for damin order creation
CREATE OR REPLACE FUNCTION public.notify_damin_order_created(
  order_id UUID,
  payer_phone_param TEXT,
  beneficiary_phone_param TEXT,
  service_details TEXT,
  amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payer_user RECORD;
  beneficiary_user RECORD;
  payer_notification_id UUID;
  beneficiary_notification_id UUID;
  clean_payer_phone TEXT;
  clean_beneficiary_phone TEXT;
BEGIN
  -- Clean phone numbers (remove + and spaces)
  clean_payer_phone := regexp_replace(payer_phone_param, '[^0-9]', '', 'g');
  clean_beneficiary_phone := regexp_replace(beneficiary_phone_param, '[^0-9]', '', 'g');
  
  -- Find payer user by phone in auth.users.phone column
  SELECT au.id, au.email, au.phone
  INTO payer_user
  FROM auth.users au
  WHERE au.phone = clean_payer_phone
  LIMIT 1;

  -- Find beneficiary user
  SELECT au.id, au.email, au.phone
  INTO beneficiary_user
  FROM auth.users au
  WHERE au.phone = clean_beneficiary_phone
  LIMIT 1;

  -- Create notification for payer if user exists
  IF payer_user.id IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id,
      type,
      title,
      body,
      data,
      damin_order_id
    ) VALUES (
      payer_user.id,
      'damin_order_created',
      'New Damin Order',
      'You have been added as the payer for a new Damin service: ' || LEFT(service_details, 100),
      jsonb_build_object(
        'order_id', order_id,
        'role', 'payer',
        'amount', amount,
        'service_details', service_details
      ),
      order_id
    )
    RETURNING id INTO payer_notification_id;
  END IF;

  -- Create notification for beneficiary if user exists
  IF beneficiary_user.id IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id,
      type,
      title,
      body,
      data,
      damin_order_id
    ) VALUES (
      beneficiary_user.id,
      'damin_order_created',
      'New Damin Order',
      'You have been added as the beneficiary for a new Damin service: ' || LEFT(service_details, 100),
      jsonb_build_object(
        'order_id', order_id,
        'role', 'beneficiary',
        'amount', amount,
        'service_details', service_details
      ),
      order_id
    )
    RETURNING id INTO beneficiary_notification_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payer_notified', (payer_user.id IS NOT NULL),
    'beneficiary_notified', (beneficiary_user.id IS NOT NULL),
    'payer_notification_id', payer_notification_id,
    'beneficiary_notification_id', beneficiary_notification_id
  );
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.notify_damin_order_created(UUID, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_damin_order_created(UUID, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

COMMENT ON TABLE public.damin_orders IS 'Damin (ضامن) service orders with dual-party confirmation and escrow management';

-- WhatsApp notification trigger for new damin orders
-- Sends WhatsApp message to both parties via Twilio when an order is created
CREATE OR REPLACE FUNCTION public.trigger_damin_whatsapp_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
  supabase_url text;
  creator_name text;
  payer_phone_clean text;
  beneficiary_phone_clean text;
BEGIN
  -- Only trigger for newly created orders
  IF NEW.status != 'created' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Supabase URL or service role key not configured. WhatsApp notification skipped.';
    RETURN NEW;
  END IF;

  edge_function_url := supabase_url || '/functions/v1/send-damin-whatsapp';

  -- Get creator's display name
  SELECT p.display_name INTO creator_name
  FROM public.profiles p
  WHERE p.user_id = NEW.creator_id
  LIMIT 1;

  IF creator_name IS NULL THEN
    creator_name := 'مستخدم كافل';
  END IF;

  -- Clean phone numbers
  payer_phone_clean := regexp_replace(NEW.payer_phone, '[^0-9+]', '', 'g');
  beneficiary_phone_clean := regexp_replace(NEW.beneficiary_phone, '[^0-9+]', '', 'g');

  -- Send WhatsApp to payer (if not the creator)
  IF NEW.payer_user_id IS NULL OR NEW.payer_user_id != NEW.creator_id THEN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'recipient_phone', payer_phone_clean,
        'requester_name', creator_name,
        'amount', NEW.total_amount::text,
        'order_id', NEW.id::text
      )
    );
  END IF;

  -- Send WhatsApp to beneficiary (if not the creator)
  IF NEW.beneficiary_user_id IS NULL OR NEW.beneficiary_user_id != NEW.creator_id THEN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'recipient_phone', beneficiary_phone_clean,
        'requester_name', creator_name,
        'amount', NEW.total_amount::text,
        'order_id', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger damin WhatsApp notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on damin_orders table for new orders
DROP TRIGGER IF EXISTS damin_orders_whatsapp_trigger ON public.damin_orders;
CREATE TRIGGER damin_orders_whatsapp_trigger
  AFTER INSERT ON public.damin_orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.trigger_damin_whatsapp_notification();
