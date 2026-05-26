import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { EMAIL_MODULE } from "../modules/email"
import type EmailService from "../modules/email/service"

export default async function gelatoStatusEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  order_id: string
  status: string
  tracking_url?: string
}>) {
  const orderModule = container.resolve(Modules.ORDER)
  const email = container.resolve(EMAIL_MODULE) as EmailService

  const order = await orderModule.retrieveOrder(data.order_id)
  if (!order.email) return

  if (data.status === "shipped") {
    await email.orderShipped(
      order.email,
      String(order.display_id ?? order.id),
      data.tracking_url
    )
  }
}

export const config: SubscriberConfig = {
  event: "gelato.order.status_updated",
}
