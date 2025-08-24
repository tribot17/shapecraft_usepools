-- Neon (PostgreSQL) schema for Scooby wallet-only auth

-- Minimal users table: one row per wallet-auth user
CREATE TABLE IF NOT EXISTS public.users (
  user_id        text PRIMARY KEY,
  wallet_address text NOT NULL,
  registered_at  timestamptz NOT NULL DEFAULT now()
);

-- Enforce one account per wallet
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_wallet ON public.users (lower(wallet_address));

-- Conversation memory table
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  message_id        bigserial PRIMARY KEY,
  user_id           text NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
  conversation_id   text NOT NULL,
  user_question     text NOT NULL,
  rewritten_question text NULL,
  intent            text NULL,
  ai_answer         text NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for fetching history
CREATE INDEX IF NOT EXISTS ix_conv_user_id ON public.conversation_messages (user_id);
CREATE INDEX IF NOT EXISTS ix_conv_conversation_id ON public.conversation_messages (conversation_id);
CREATE INDEX IF NOT EXISTS ix_conv_user_conv_created ON public.conversation_messages (user_id, conversation_id, created_at);

