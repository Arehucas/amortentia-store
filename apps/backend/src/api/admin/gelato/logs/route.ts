import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GELATO_PERSISTENCE_MODULE } from "../../../../modules/gelato-persistence"
import type GelatoPersistenceService from "../../../../modules/gelato-persistence/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const persistence = req.scope.resolve(
    GELATO_PERSISTENCE_MODULE
  ) as GelatoPersistenceService

  const [webhooks, catalogSync] = await Promise.all([
    persistence.listWebhookLogs(50),
    persistence.listCatalogSyncLogs(20),
  ])

  res.json({ webhooks, catalogSync })
}
