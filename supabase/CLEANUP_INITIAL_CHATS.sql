-- Clean up initial/seed conversations and messages
-- This removes the demo conversations that were created during database setup

-- Step 1: Delete all messages from demo conversations
DELETE FROM public.messages 
WHERE conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = public.conversations.id
    AND cm.user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  )
);

-- Step 2: Delete conversation members for demo users
DELETE FROM public.conversation_members
WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- Step 3: Delete orphaned conversations (conversations with no members)
DELETE FROM public.conversations
WHERE id NOT IN (
  SELECT DISTINCT conversation_id 
  FROM public.conversation_members
);

-- Step 4: (Optional) Delete demo users if they exist and you want to remove them
-- Uncomment the lines below if you want to remove the demo users completely
-- DELETE FROM auth.users WHERE id IN (
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002'
-- );

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM public.conversations) as total_conversations,
  (SELECT COUNT(*) FROM public.messages) as total_messages,
  (SELECT COUNT(*) FROM public.conversation_members) as total_members;

