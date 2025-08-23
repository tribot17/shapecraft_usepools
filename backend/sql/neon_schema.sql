-- Neon (PostgreSQL) schema for Scooby auth and wallet features

-- Core users table (store UUIDs as text; app generates them)
CREATE TABLE IF NOT EXISTS public.users (
  user_id        text PRIMARY KEY,
  email          text NOT NULL,
  password_hash  text NOT NULL,
  registered_at  timestamptz NOT NULL DEFAULT now(),
  wallet_address text NULL,
  verified_at timestamptz NULL
);

-- Case-insensitive unique email
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci ON public.users (lower(email));

-- Optional: enforce unique wallet per user (uncomment to enable)
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_users_wallet ON public.users (wallet_address) WHERE wallet_address IS NOT NULL;

-- Email verification codes for sign-up flow
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id           bigserial PRIMARY KEY,
  user_id      text NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  email        text NULL,
  password_hash text NULL,
  code         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at  timestamptz NULL
);

-- Fast lookup by code
CREATE INDEX IF NOT EXISTS ix_verif_code ON public.email_verification_codes (code);
CREATE INDEX IF NOT EXISTS ix_verif_email_ci ON public.email_verification_codes (lower(email));

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

