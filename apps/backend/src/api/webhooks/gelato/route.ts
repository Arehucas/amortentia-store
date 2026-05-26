import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createHash, timingSafeEqual } from "crypto"
import { GELATO_MODULE } from "../../../modules/gelato"
import type GelatoService from "../../../modules/gelato/service"
import { rateLimit } from "../../../lib/rate-limit"

function verifyWebhookSecret(req: MedusaRequest): boolean {
  const secret = process.env.GELATO_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV === "development"

  const header =
    req.headers["x-gelato-signature"] ??
    req.headers["x-webhook-secret"] ??
    req.headers["authorization"]

  if (!header) return false

  const provided = Array.isArray(header) ? header[0] : String(header)
  const expected = createHash("sha256").update(secret).digest("hex")

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return provided === secret || provided === `Bearer ${secret}`
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ip = req.ip ?? "unknown"
  if (!rateLimit(`webhook-gelato:${ip}`, 120, 60_000)) {
    res.status(429).json({ message: "Too many requests" })
    return
  }

  if (!verifyWebhookSecret(req)) {
    res.status(401).json({ message: "Webhook no validado" })
    return
  }

  const gelato = req.scope.resolve(GELATO_MODULE) as GelatoService
  const orderModule = req.scope.resolve(Modules.ORDER)
  const payload = req.body as Record<string, unknown>

  const result = await gelato.processWebhook(payload)

  if (result.duplicate) {
    res.status(200).json({ ok: true, duplicate: true })
    return
  }

  if (result.medusaOrderId) {
    const metadata: Record<string, unknown> = {
      gelato_status: result.internalStatus,
      last_gelato_sync_at: new Date().toISOString(),
    }
    if (result.trackingNumber) metadata.tracking_number = result.trackingNumber
    if (result.trackingUrl) metadata.tracking_url = result.trackingUrl

    const order = await orderModule.retrieveOrder(result.medusaOrderId)
    await orderModule.updateOrders(result.medusaOrderId, {
      metadata: { ...(order.metadata ?? {}), ...metadata },
    })

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "gelato.order.status_updated",
      data: {
        order_id: result.medusaOrderId,
        status: result.internalStatus,
        tracking_url: result.trackingUrl,
      },
    })
  }

  res.status(200).json({ ok: true, ...result })
}
