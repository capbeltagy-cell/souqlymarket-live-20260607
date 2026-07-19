CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 255),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 2 AND 150),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_submissions FROM anon, authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

CREATE INDEX IF NOT EXISTS contact_submissions_email_created_idx
  ON public.contact_submissions (email, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_submissions_status_created_idx
  ON public.contact_submissions (status, created_at DESC);
