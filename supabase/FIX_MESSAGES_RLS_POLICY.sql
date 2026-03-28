-- Fix for "new row violates row-level security policy" error when sending messages with media
-- Run this in your Supabase SQL editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Members send messages" ON public.messages;

-- Recreate with correct syntax
CREATE POLICY "Members send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()
    )
  );

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

