import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { GELATO_MODULE } from "../../../../../modules/gelato"
import type GelatoService from "../../../../../modules/gelato/service"
import { GELATO_PERSISTENCE_MODULE } from "../../../../../modules/gelato-persistence"
import type GelatoPersistenceService from "../../../../../modules/gelato-persistence/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id as string
  const orderModule = req.scope.resolve(Modules.ORDER)
  const gelato = req.scope.resolve(GELATO_MODULE) as GelatoService
  const persistence = req.scope.resolve(
    GELATO_PERSISTENCE_MODULE
  ) as GelatoPersistenceService

  const order = await orderModule.retrieveOrder(orderId)
  const gelatoRow = await persistence.findGelatoOrderByMedusaId(orderId)

  const internalStatus = String(
    order.metadata?.gelato_status ?? gelatoRow?.status ?? "pending"
  )

  res.json({
    order_id: order.id,
    display_id: order.display_id,
    status_internal: internalStatus,
    status_user: gelato.mapGelatoStatusToUser(internalStatus),
    gelato_order_id: order.metadata?.gelato_order_id ?? gelatoRow?.gelato_order_id,
    tracking_number: order.metadata?.tracking_number ?? gelatoRow?.tracking_number,
    tracking_url: order.metadata?.tracking_url ?? gelatoRow?.tracking_url,
    error: order.metadata?.gelato_error ?? gelatoRow?.error_message,
  })
}
