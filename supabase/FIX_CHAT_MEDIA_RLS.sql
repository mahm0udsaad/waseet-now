-- COMPLETE FIX for chat media messages RLS errors
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. FIX MESSAGES TABLE INSERT POLICY
-- ============================================
DROP POLICY IF EXISTS "Members send messages" ON public.messages;

CREATE POLICY "Members send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
  )
);

-- ============================================
-- 2. FIX STORAGE BUCKET POLICIES FOR CHAT
-- ============================================

-- First, ensure the chat bucket exists (private bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat', 'chat', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing chat storage policies
DROP POLICY IF EXISTS "Members read chat bucket" ON storage.objects;
DROP POLICY IF EXISTS "Members write chat bucket" ON storage.objects;
DROP POLICY IF EXISTS "Chat bucket read" ON storage.objects;
DROP POLICY IF EXISTS "Chat bucket write" ON storage.objects;
DROP POLICY IF EXISTS "chat_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_write" ON storage.objects;

-- Create READ policy - any authenticated user can read from chat bucket
CREATE POLICY "Members read chat bucket" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat' 
  AND auth.uid() IS NOT NULL
);

-- Create INSERT policy - users can upload to their own folder
CREATE POLICY "Chat bucket insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create UPDATE policy - users can update files in their own folder  
CREATE POLICY "Chat bucket update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create DELETE policy - users can delete files in their own folder
CREATE POLICY "Chat bucket delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 3. RELOAD SCHEMA CACHE
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- DONE! Media messages should now work.
-- ============================================

