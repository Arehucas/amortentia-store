import { MedusaContainer } from "@medusajs/framework"
import { GELATO_MODULE } from "../modules/gelato"
import type GelatoService from "../modules/gelato/service"

export default async function simulateGelatoWebhook({
  container,
}: {
  container: MedusaContainer
}) {
  const orderId = process.argv[2]
  if (!orderId) {
    throw new Error("Uso: medusa exec ./src/scripts/simulate-gelato-webhook.ts <medusa_order_id>")
  }

  const gelato = container.resolve(GELATO_MODULE) as GelatoService

  const statuses = ["in_production", "shipped", "delivered"] as const

  for (const status of statuses) {
    await gelato.processWebhook({
      id: `sim-${orderId}-${status}-${Date.now()}`,
      event: "order_status_updated",
      orderReferenceId: orderId,
      fulfillmentStatus: status,
      trackingCode: status === "shipped" ? "ES-MOCK-TRACK-001" : undefined,
      trackingUrl:
        status === "shipped"
          ? "https://track.example.com/ES-MOCK-TRACK-001"
          : undefined,
    })
    console.log(`[simulate] Estado ${status} aplicado`)
  }
}
