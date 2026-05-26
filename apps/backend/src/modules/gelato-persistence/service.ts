import { readFileSync } from "fs"
import { join } from "path"
import { Pool } from "pg"
import type { Logger } from "@medusajs/framework/types"

type GelatoOrderRow = {
  id: string
  medusa_order_id: string
  gelato_order_id: string | null
  status: string
  request_payload: unknown
  response_payload: unknown
  tracking_number: string | null
  tracking_url: string | null
  error_message: string | null
  created_at: Date
  updated_at: Date
}

export default class GelatoPersistenceService {
  static identifier = "gelatoPersistence"

  private pool: Pool
  private logger: Logger
  private migrated = false

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

  async ensureSchema() {
    if (this.migrated) return
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/001_gelato_tables.sql"
    )
    const fallbackPath = join(
      process.cwd(),
      "../../supabase/migrations/001_gelato_tables.sql"
    )
    let sql: string
    try {
      sql = readFileSync(migrationPath, "utf8")
    } catch {
      sql = readFileSync(fallbackPath, "utf8")
    }
    await this.pool.query(sql)
    this.migrated = true
    this.logger.info("[gelato-persistence] Schema ensured")
  }

  async findGelatoOrderByMedusaId(medusaOrderId: string) {
    await this.ensureSchema()
    const { rows } = await this.pool.query<GelatoOrderRow>(
      `SELECT * FROM gelato_orders WHERE medusa_order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [medusaOrderId]
    )
    return rows[0] ?? null
  }

  async findGelatoOrderByGelatoId(gelatoOrderId: string) {
    await this.ensureSchema()
    const { rows } = await this.pool.query<GelatoOrderRow>(
      `SELECT * FROM gelato_orders WHERE gelato_order_id = $1 LIMIT 1`,
      [gelatoOrderId]
    )
    return rows[0] ?? null
  }

  async createGelatoOrderRecord(input: {
    medusaOrderId: string
    status: string
    requestPayload?: unknown
    responsePayload?: unknown
    gelatoOrderId?: string
    errorMessage?: string
  }) {
    await this.ensureSchema()
    const { rows } = await this.pool.query<GelatoOrderRow>(
      `INSERT INTO gelato_orders (medusa_order_id, gelato_order_id, status, request_payload, response_payload, error_message)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING *`,
      [
        input.medusaOrderId,
        input.gelatoOrderId ?? null,
        input.status,
        input.requestPayload ? JSON.stringify(input.requestPayload) : null,
        input.responsePayload ? JSON.stringify(input.responsePayload) : null,
        input.errorMessage ?? null,
      ]
    )
    return rows[0]
  }

  async updateGelatoOrderRecord(
    id: string,
    input: Partial<{
      gelatoOrderId: string
      status: string
      responsePayload: unknown
      trackingNumber: string
      trackingUrl: string
      errorMessage: string
    }>
  ) {
    await this.ensureSchema()
    const { rows } = await this.pool.query<GelatoOrderRow>(
      `UPDATE gelato_orders SET
        gelato_order_id = COALESCE($2, gelato_order_id),
        status = COALESCE($3, status),
        response_payload = COALESCE($4::jsonb, response_payload),
        tracking_number = COALESCE($5, tracking_number),
        tracking_url = COALESCE($6, tracking_url),
        error_message = COALESCE($7, error_message),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.gelatoOrderId ?? null,
        input.status ?? null,
        input.responsePayload ? JSON.stringify(input.responsePayload) : null,
        input.trackingNumber ?? null,
        input.trackingUrl ?? null,
        input.errorMessage ?? null,
      ]
    )
    return rows[0]
  }

  async logWebhook(input: {
    provider: string
    eventId: string
    eventType: string
    payload: unknown
    processed?: boolean
    errorMessage?: string
  }) {
    await this.ensureSchema()
    const { rows } = await this.pool.query(
      `INSERT INTO webhook_logs (provider, event_id, event_type, payload, processed, error_message)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (event_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         processed = EXCLUDED.processed,
         error_message = EXCLUDED.error_message,
         processed_at = CASE WHEN EXCLUDED.processed THEN NOW() ELSE webhook_logs.processed_at END
       RETURNING *`,
      [
        input.provider,
        input.eventId,
        input.eventType,
        JSON.stringify(input.payload),
        input.processed ?? false,
        input.errorMessage ?? null,
      ]
    )
    return rows[0]
  }

  async getWebhookByEventId(eventId: string) {
    await this.ensureSchema()
    const { rows } = await this.pool.query(
      `SELECT * FROM webhook_logs WHERE event_id = $1`,
      [eventId]
    )
    return rows[0] ?? null
  }

  async startCatalogSync(syncType: string) {
    await this.ensureSchema()
    const { rows } = await this.pool.query(
      `INSERT INTO catalog_sync_logs (sync_type, status) VALUES ($1, 'running') RETURNING *`,
      [syncType]
    )
    return rows[0]
  }

  async finishCatalogSync(
    id: string,
    input: {
      status: string
      itemsCreated: number
      itemsUpdated: number
      itemsSkipped: number
      errorMessage?: string
    }
  ) {
    await this.ensureSchema()
    await this.pool.query(
      `UPDATE catalog_sync_logs SET
        status = $2,
        items_created = $3,
        items_updated = $4,
        items_skipped = $5,
        error_message = $6,
        finished_at = NOW()
       WHERE id = $1`,
      [
        id,
        input.status,
        input.itemsCreated,
        input.itemsUpdated,
        input.itemsSkipped,
        input.errorMessage ?? null,
      ]
    )
  }

  async listCatalogSyncLogs(limit = 20) {
    await this.ensureSchema()
    const { rows } = await this.pool.query(
      `SELECT * FROM catalog_sync_logs ORDER BY started_at DESC LIMIT $1`,
      [limit]
    )
    return rows
  }

  async listWebhookLogs(limit = 50) {
    await this.ensureSchema()
    const { rows } = await this.pool.query(
      `SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )
    return rows
  }

  async audit(action: string, actor?: string, resourceId?: string, payload?: unknown) {
    await this.ensureSchema()
    await this.pool.query(
      `INSERT INTO audit_logs (action, actor, resource_id, payload) VALUES ($1, $2, $3, $4::jsonb)`,
      [action, actor ?? null, resourceId ?? null, payload ? JSON.stringify(payload) : null]
    )
  }
}
