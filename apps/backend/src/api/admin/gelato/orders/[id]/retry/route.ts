import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { GELATO_MODULE } from "../../../../../../modules/gelato"
import type GelatoService from "../../../../../../modules/gelato/service"
import { GELATO_PERSISTENCE_MODULE } from "../../../../../../modules/gelato-persistence"
import type GelatoPersistenceService from "../../../../../../modules/gelato-persistence/service"
import { rateLimit } from "../../../../../../lib/rate-limit"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!rateLimit(`admin-retry:${actorId ?? "anon"}`, 20, 60_000)) {
    res.status(429).json({ message: "Too many requests" })
    return
  }

  const orderId = z.string().parse(req.params.id)
  const gelato = req.scope.resolve(GELATO_MODULE) as GelatoService
  const persistence = req.scope.resolve(
    GELATO_PERSISTENCE_MODULE
  ) as GelatoPersistenceService
  const orderModule = req.scope.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items", "items.variant", "shipping_address"],
  })

  const existing = await persistence.findGelatoOrderByMedusaId(orderId)
  if (existing?.gelato_order_id) {
    res.status(409).json({ message: "El pedido ya fue enviado a Gelato" })
    return
  }

  const result = await gelato.submitOrderToGelato(order as never)

  await persistence.audit(
    "retry_gelato_order",
    actorId,
    orderId,
    result
  )

  if (result.error) {
    res.status(400).json(result)
    return
  }

  res.json(result)
}
