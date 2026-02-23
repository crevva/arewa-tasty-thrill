CREATE TABLE IF NOT EXISTS backoffice_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL UNIQUE REFERENCES users_profile(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_by_user_profile_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backoffice_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by_user_profile_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE RESTRICT,
  accepted_user_profile_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backoffice_users_role ON backoffice_users(role);
CREATE INDEX IF NOT EXISTS idx_backoffice_users_status ON backoffice_users(status);
CREATE INDEX IF NOT EXISTS idx_backoffice_invites_email_lower ON backoffice_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_backoffice_invites_status_expires ON backoffice_invites(status, expires_at);
