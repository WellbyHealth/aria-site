-- CFO Hub v1 schema. Every table carries practice_id; all money is in cents.
create table if not exists practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  name text not null
);
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'owner' check (role in ('owner','manager','viewer')),
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  item_id text not null unique,
  institution_name text,
  access_token_enc text not null,
  cursor text,
  status text not null default 'ok' check (status in ('ok','reconnect','removed')),
  error_code text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  plaid_item_id uuid references plaid_items(id) on delete cascade,
  account_id text not null unique,
  name text not null,
  mask text,
  type text,
  subtype text,
  location_id uuid references locations(id) on delete set null,
  current_cents bigint,
  available_cents bigint,
  balance_at timestamptz
);
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  source text not null check (source in ('plaid','stripe','manual')),
  source_id text not null,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  posted_on date not null,
  amount_cents bigint not null, -- positive = money in, negative = money out
  description text not null,
  merchant text,
  category text,
  kind text not null default 'other' check (kind in ('insurer_deposit','patient_payment','processor_payout','payroll','vendor','transfer','other')),
  payer text,
  pending boolean not null default false,
  matched_remittance_id uuid,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists ledger_practice_date on ledger_entries (practice_id, posted_on desc);
create table if not exists stripe_accounts (
  practice_id uuid primary key references practices(id) on delete cascade,
  account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  statement_ref text not null, -- opaque Aria reference; never clinical detail
  patient_name text not null,
  patient_contact text,
  amount_cents bigint not null check (amount_cents > 0),
  fee_cents bigint not null default 0,
  status text not null default 'open' check (status in ('open','paid','expired','canceled')),
  checkout_url text,
  stripe_session_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists remittances (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  payer text not null,
  trace_number text not null,
  paid_on date,
  total_cents bigint not null,
  method text,
  file_name text,
  matched_entry_id uuid references ledger_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (practice_id, trace_number)
);
create table if not exists remittance_claims (
  id uuid primary key default gen_random_uuid(),
  remittance_id uuid not null references remittances(id) on delete cascade,
  claim_ref text not null,
  status_code text,
  billed_cents bigint not null,
  paid_cents bigint not null,
  patient_resp_cents bigint not null default 0,
  adjustments jsonb not null default '[]'
);
create table if not exists audit_events (
  id bigserial primary key,
  practice_id uuid,
  user_id uuid,
  kind text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- v2: remittance detail, thresholds, alerts, Stripe payouts.
alter table remittance_claims add column if not exists received_on date;
alter table remittance_claims add column if not exists rendering_provider text;
create table if not exists practice_settings (
  practice_id uuid primary key references practices(id) on delete cascade,
  cash_floor_cents bigint not null default 0,
  days_cash_min int not null default 30,
  denial_rate_max_bps int not null default 800,
  days_to_pay_max int not null default 30,
  staff_cost_max_bps int not null default 6000,
  unmatched_days int not null default 5,
  updated_at timestamptz not null default now()
);
create table if not exists alerts (
  practice_id uuid not null references practices(id) on delete cascade,
  key text not null,
  title text not null,
  tone text not null,
  value_text text,
  threshold_text text,
  href text,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  primary key (practice_id, key)
);
create table if not exists stripe_payouts (
  payout_id text primary key,
  practice_id uuid not null references practices(id) on delete cascade,
  amount_cents bigint not null,
  arrival_date date not null,
  status text not null,
  matched_entry_id uuid references ledger_entries(id) on delete set null
);
