import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GELATO_MODULE } from "../modules/gelato"
import type GelatoService from "../modules/gelato/service"
import { EMAIL_MODULE } from "../modules/email"
import type EmailService from "../modules/email/service"

export default async function gelatoOrderPaidHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const gelato = container.resolve(GELATO_MODULE) as GelatoService
  const email = container.resolve(EMAIL_MODULE) as EmailService

  const order = await orderModule.retrieveOrder(data.id, {
    relations: ["items", "items.variant", "shipping_address"],
  })

  const paymentStatus = (order as { payment_status?: string }).payment_status
  const isDev = process.env.NODE_ENV === "development"
  if (
    !isDev &&
    paymentStatus &&
    paymentStatus !== "captured" &&
    paymentStatus !== "paid"
  ) {
    return
  }

  const result = await gelato.submitOrderToGelato(order as never)

  const metadata: Record<string, unknown> = {
    ...(order.metadata ?? {}),
    gelato_status: result.success
      ? "sent_to_gelato"
      : result.skipped
        ? order.metadata?.gelato_status
        : "gelato_failed",
    last_gelato_sync_at: new Date().toISOString(),
  }

  if (result.record?.gelato_order_id) {
    metadata.gelato_order_id = result.record.gelato_order_id
  }
  if (result.error) {
    metadata.gelato_error = result.error
  }

  await orderModule.updateOrders(data.id, { metadata })

  if (result.success && order.email) {
    await email.orderConfirmed(order.email, String(order.display_id ?? order.id))
  }

  if (result.error) {
    logger.warn(`[gelato] Pedido ${data.id} no enviado: ${result.error}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
