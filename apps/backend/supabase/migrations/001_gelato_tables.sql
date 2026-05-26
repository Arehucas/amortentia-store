-- Tablas auxiliares Gelato / auditoría (mismo Postgres que Medusa)

CREATE TABLE IF NOT EXISTS gelato_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  medusa_order_id TEXT NOT NULL,
  gelato_order_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  tracking_number TEXT,
  tracking_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gelato_orders_medusa_order_id ON gelato_orders (medusa_order_id);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs (provider);

CREATE TABLE IF NOT EXISTS catalog_sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider TEXT NOT NULL DEFAULT 'gelato',
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  items_created INT NOT NULL DEFAULT 0,
  items_updated INT NOT NULL DEFAULT 0,
  items_skipped INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  actor TEXT,
  resource_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
