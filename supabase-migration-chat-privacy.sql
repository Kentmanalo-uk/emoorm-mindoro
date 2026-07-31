-- ============================================================
-- Chat Privacy: Ensure each user can only access their own
-- conversations and messages (Row Level Security)
-- ============================================================

-- 1. Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE OR REPLACE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid()::text = "userId"::text);

-- Users can only insert conversations they own
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE OR REPLACE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid()::text = "userId"::text);

-- Users can only update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE OR REPLACE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid()::text = "userId"::text);

-- Users can only delete their own conversations
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE OR REPLACE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid()::text = "userId"::text);


-- 2. Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or that were sent to them
-- Also allows seeing bot messages (senderId = 'bella-bot') in their conversations
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE OR REPLACE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    auth.uid()::text = "senderId"::text
    OR auth.uid()::text = "recipientId"::text
  );

-- Users can insert messages where they are the sender
-- OR where they are the recipient (needed for bot reply insertions)
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE OR REPLACE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid()::text = "senderId"::text
    OR auth.uid()::text = "recipientId"::text
  );

-- Users can delete messages where they are a participant
-- (needed for "Clear Chat" feature)
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE OR REPLACE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (
    auth.uid()::text = "senderId"::text
    OR auth.uid()::text = "recipientId"::text
  );


-- 3. Admin access: allow admin role users full access

-- Admin can view all conversations (for the admin messages panel)
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
CREATE OR REPLACE POLICY "Admins can view all conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

-- Admin can view all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE OR REPLACE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

-- Admin can insert messages (for replying from admin panel)
DROP POLICY IF EXISTS "Admins can insert messages" ON messages;
CREATE OR REPLACE POLICY "Admins can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

-- Admin can update conversations (for updating lastMessage etc)
DROP POLICY IF EXISTS "Admins can update any conversation" ON conversations;
CREATE OR REPLACE POLICY "Admins can update any conversation"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );


-- ============================================================
-- 4. CLEANUP: Migrate old shared 'bella-bot' data
--    Old messages used conversationId = 'bella-bot' for ALL users.
--    Now each user has their own bot convo: 'bella-bot-{userId}'.
--    Delete the old shared rows so users start fresh.
-- ============================================================

-- Delete old shared bot messages (exact match only — not per-user ones)
DELETE FROM messages WHERE "conversationId"::text = 'bella-bot';

-- Delete old shared bot conversation row (exact match only)
DELETE FROM conversations WHERE id::text = 'bella-bot';
