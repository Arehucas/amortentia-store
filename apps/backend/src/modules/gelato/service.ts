import { GelatoClient } from "@amortentia/gelato-client"
import type { CreateGelatoOrderInput } from "@amortentia/gelato-client"
import type { Logger } from "@medusajs/framework/types"
import { GELATO_PERSISTENCE_MODULE } from "../gelato-persistence"
import GelatoPersistenceService from "../gelato-persistence/service"
import { GELATO_STATUS_MAP, USER_FACING_STATUS } from "./constants"

type OrderLike = {
  id: string
  email?: string
  currency_code?: string
  metadata?: Record<string, unknown>
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  items?: Array<{
    id: string
    quantity: number
    variant?: {
      metadata?: Record<string, unknown>
    }
  }>
}

export default class GelatoService {
  private client: GelatoClient
  private persistence: GelatoPersistenceService
  private logger: Logger

  constructor(deps: { logger: Logger }) {
    this.logger = deps.logger
    this.persistence = new GelatoPersistenceService({ logger: deps.logger })
    this.client = new GelatoClient({
      apiKey: process.env.GELATO_API_KEY,
      storeId: process.env.GELATO_STORE_ID,
      mock: process.env.GELATO_MOCK === "true" || !process.env.GELATO_API_KEY,
    })
  }

  async ensurePersistenceReady() {
    await this.persistence.ensureSchema()
  }

  validateOrderForGelato(order: OrderLike): string | null {
    if (order.currency_code && order.currency_code.toLowerCase() !== "eur") {
      return "Solo se admite EUR en el MVP"
    }
    const country = order.shipping_address?.country_code?.toLowerCase()
    if (country && country !== "es") {
      return "Solo se admite envío a España (ES)"
    }
    if (!order.items?.length) {
      return "El pedido no tiene líneas"
    }
    for (const item of order.items) {
      const meta = item.variant?.metadata ?? {}
      if (!meta.gelato_product_uid) {
        return `Falta gelato_product_uid en variante del item ${item.id}`
      }
      if (!meta.print_file_url) {
        return `Falta print_file_url en variante del item ${item.id}`
      }
    }
    return null
  }

  buildGelatoPayload(order: OrderLike): CreateGelatoOrderInput {
    const addr = order.shipping_address!
    return {
      orderReferenceId: order.id,
      customerReferenceId: order.email ?? order.id,
      currency: "EUR",
      recipient: {
        firstName: addr.first_name ?? "Cliente",
        lastName: addr.last_name ?? "Amortentia",
        addressLine1: addr.address_1 ?? "",
        city: addr.city ?? "",
        postcode: addr.postal_code ?? "",
        country: (addr.country_code ?? "es").toUpperCase(),
        email: order.email ?? "cliente@amortentia.local",
      },
      items: (order.items ?? []).map((item) => {
        const meta = item.variant?.metadata ?? {}
        return {
          itemReferenceId: item.id,
          productUid: String(meta.gelato_product_uid),
          variantId: meta.gelato_variant_id
            ? String(meta.gelato_variant_id)
            : undefined,
          quantity: item.quantity,
          files: [
            {
              type: "default",
              url: String(meta.print_file_url),
            },
          ],
        }
      }),
    }
  }

  async submitOrderToGelato(order: OrderLike) {
    await this.ensurePersistenceReady()

    const existing = await this.persistence.findGelatoOrderByMedusaId(order.id)
    if (existing?.gelato_order_id) {
      return { skipped: true, record: existing }
    }

    const validationError = this.validateOrderForGelato(order)
    if (validationError) {
      const record = await this.persistence.createGelatoOrderRecord({
        medusaOrderId: order.id,
        status: "gelato_failed",
        errorMessage: validationError,
      })
      return { error: validationError, record }
    }

    const payload = this.buildGelatoPayload(order)
    const record = await this.persistence.createGelatoOrderRecord({
      medusaOrderId: order.id,
      status: "pending",
      requestPayload: payload,
    })

    try {
      const response = await this.client.createOrder(payload)
      const updated = await this.persistence.updateGelatoOrderRecord(record.id, {
        gelatoOrderId: response.id,
        status: "sent_to_gelato",
        responsePayload: response,
      })
      return { success: true, record: updated, response }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido Gelato"
      const updated = await this.persistence.updateGelatoOrderRecord(record.id, {
        status: "gelato_failed",
        errorMessage: message,
      })
      this.logger.error(`[gelato] Error enviando pedido ${order.id}: ${message}`)
      return { error: message, record: updated }
    }
  }

  async processWebhook(payload: Record<string, unknown>) {
    await this.ensurePersistenceReady()

    const eventId = String(
      payload.id ?? payload.eventId ?? `${payload.orderId}-${payload.fulfillmentStatus}`
    )
    const eventType = String(payload.event ?? payload.type ?? "order_status_updated")

    const existing = await this.persistence.getWebhookByEventId(eventId)
    if (existing?.processed) {
      return { duplicate: true }
    }

    await this.persistence.logWebhook({
      provider: "gelato",
      eventId,
      eventType,
      payload,
      processed: false,
    })

    const orderReferenceId = String(
      payload.orderReferenceId ?? payload.order_reference_id ?? ""
    )
    const gelatoOrderId = payload.orderId ? String(payload.orderId) : undefined
    const fulfillmentStatus = String(
      payload.fulfillmentStatus ?? payload.status ?? ""
    ).toLowerCase()

    const internalStatus = GELATO_STATUS_MAP[fulfillmentStatus] ?? "in_production"

    let medusaOrderId = orderReferenceId
    if (!medusaOrderId && gelatoOrderId) {
      const row = await this.persistence.findGelatoOrderByGelatoId(gelatoOrderId)
      medusaOrderId = row?.medusa_order_id ?? ""
    }

    if (medusaOrderId) {
      const row =
        (await this.persistence.findGelatoOrderByMedusaId(medusaOrderId)) ??
        (gelatoOrderId
          ? await this.persistence.findGelatoOrderByGelatoId(gelatoOrderId)
          : null)

      if (row) {
        await this.persistence.updateGelatoOrderRecord(row.id, {
          status: internalStatus,
          gelatoOrderId: gelatoOrderId ?? row.gelato_order_id ?? undefined,
          trackingNumber: payload.trackingCode
            ? String(payload.trackingCode)
            : undefined,
          trackingUrl: payload.trackingUrl
            ? String(payload.trackingUrl)
            : undefined,
          responsePayload: payload,
        })
      }
    }

    await this.persistence.logWebhook({
      provider: "gelato",
      eventId,
      eventType,
      payload,
      processed: true,
    })

    return {
      eventId,
      medusaOrderId,
      internalStatus,
      trackingUrl: payload.trackingUrl,
      trackingNumber: payload.trackingCode,
    }
  }

  async listGelatoProducts() {
    return this.client.listStoreProducts()
  }

  mapGelatoStatusToUser(status: string) {
    return USER_FACING_STATUS[status] ?? status
  }
}
