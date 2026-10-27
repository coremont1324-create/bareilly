-- Mandal Schemes Portal: initial schema
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE publication_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE application_status AS ENUM ('open', 'closed', 'year_round', 'tbc');
CREATE TYPE admin_role AS ENUM ('super_admin', 'editor');

-- ---------------------------------------------------------------- geography
CREATE TABLE states (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  code        text NOT NULL UNIQUE
);

CREATE TABLE districts (
  id          serial PRIMARY KEY,
  state_id    integer NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  UNIQUE (state_id, name)
);

CREATE TABLE mandals (
  id          serial PRIMARY KEY,
  district_id integer NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  UNIQUE (district_id, name)
);
CREATE INDEX mandals_district_idx ON mandals (district_id);

-- ---------------------------------------------------------------- taxonomy
CREATE TABLE categories (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT 'grid',
  color       text NOT NULL DEFAULT 'slate',
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE departments (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  level       text NOT NULL DEFAULT 'central' CHECK (level IN ('central', 'state', 'district', 'mandal'))
);

CREATE TABLE beneficiary_groups (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL
);

-- ---------------------------------------------------------------- admin users
CREATE TABLE admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  role           admin_role NOT NULL DEFAULT 'editor',
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_uidx ON admin_users (lower(email));

CREATE TABLE sessions (
  id           text PRIMARY KEY,               -- SHA-256 of the opaque cookie token
  user_id      uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  ip           text,
  user_agent   text
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- ---------------------------------------------------------------- schemes
CREATE TABLE schemes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text NOT NULL UNIQUE,
  name                    text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 160),
  short_description       text NOT NULL DEFAULT '',
  overview                text NOT NULL DEFAULT '',
  keywords                text NOT NULL DEFAULT '',
  category_id             integer REFERENCES categories(id) ON DELETE RESTRICT,
  department_id           integer REFERENCES departments(id) ON DELETE RESTRICT,
  target_group            text NOT NULL DEFAULT '',
  eligibility_summary     text NOT NULL DEFAULT '',
  benefits_summary        text NOT NULL DEFAULT '',
  eligibility             jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(eligibility) = 'array'),
  benefits                jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(benefits) = 'array'),
  required_documents      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(required_documents) = 'array'),
  application_steps       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(application_steps) = 'array'),
  application_status      application_status NOT NULL DEFAULT 'tbc',
  deadline                date,
  official_url            text,
  application_url         text,
  guidelines_url          text,
  help_phone              text,
  help_email              text,
  help_notes              text NOT NULL DEFAULT '',
  available_all_mandals   boolean NOT NULL DEFAULT false,
  tbc_fields              text[] NOT NULL DEFAULT '{}',
  verification_source     text NOT NULL DEFAULT '',
  verification_source_url text,
  last_verified_on        date,
  review_due_on           date,
  notes                   text NOT NULL DEFAULT '',
  is_featured             boolean NOT NULL DEFAULT false,
  is_demo                 boolean NOT NULL DEFAULT false,
  publication_status      publication_status NOT NULL DEFAULT 'draft',
  published_at            timestamptz,
  archived_at             timestamptz,
  version                 integer NOT NULL DEFAULT 1,
  search_text             text NOT NULL DEFAULT '',
  search_compact          text NOT NULL DEFAULT '',
  created_by              uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by              uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX schemes_pub_idx ON schemes (publication_status);
CREATE INDEX schemes_category_idx ON schemes (category_id);
CREATE INDEX schemes_department_idx ON schemes (department_id);
CREATE INDEX schemes_deadline_idx ON schemes (deadline) WHERE deadline IS NOT NULL;
CREATE INDEX schemes_search_trgm ON schemes USING gin (search_text gin_trgm_ops);
CREATE INDEX schemes_compact_trgm ON schemes USING gin (search_compact gin_trgm_ops);

CREATE TABLE scheme_mandals (
  scheme_id  uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  mandal_id  integer NOT NULL REFERENCES mandals(id) ON DELETE CASCADE,
  PRIMARY KEY (scheme_id, mandal_id)
);
CREATE INDEX scheme_mandals_mandal_idx ON scheme_mandals (mandal_id);

CREATE TABLE scheme_beneficiary_groups (
  scheme_id  uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  group_id   integer NOT NULL REFERENCES beneficiary_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (scheme_id, group_id)
);
CREATE INDEX scheme_groups_group_idx ON scheme_beneficiary_groups (group_id);

CREATE TABLE scheme_verifications (
  id           bigserial PRIMARY KEY,
  scheme_id    uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  source       text NOT NULL,
  source_url   text,
  verified_on  date NOT NULL,
  verified_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scheme_verifications_scheme_idx ON scheme_verifications (scheme_id, created_at DESC);

-- ---------------------------------------------------------------- notices
CREATE TABLE notices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  summary             text NOT NULL DEFAULT '',
  published_on        date NOT NULL,
  deadline            date,
  scheme_id           uuid REFERENCES schemes(id) ON DELETE SET NULL,
  official_url        text,
  is_demo             boolean NOT NULL DEFAULT false,
  publication_status  publication_status NOT NULL DEFAULT 'draft',
  version             integer NOT NULL DEFAULT 1,
  created_by          uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notices_pub_idx ON notices (publication_status, published_on DESC);
CREATE INDEX notices_scheme_idx ON notices (scheme_id);

-- ---------------------------------------------------------------- audit
CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  action       text NOT NULL,
  actor_id     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_email  text,
  changes      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_created_idx ON audit_log (created_at DESC);

-- ---------------------------------------------------------------- settings & offices
CREATE TABLE settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mandal_offices (
  mandal_id    integer PRIMARY KEY REFERENCES mandals(id) ON DELETE CASCADE,
  office_name  text NOT NULL,
  address      text NOT NULL DEFAULT '',
  phone        text,
  email        text,
  hours        text NOT NULL DEFAULT '',
  is_verified  boolean NOT NULL DEFAULT false,
  verified_on  date,
  source       text NOT NULL DEFAULT '',
  updated_by   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
