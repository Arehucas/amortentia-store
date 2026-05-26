import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { GELATO_CATALOG_MODULE } from "../../../../../modules/gelato-catalog"
import type GelatoCatalogService from "../../../../../modules/gelato-catalog/service"
import { rateLimit } from "../../../../../lib/rate-limit"

const BodySchema = z.object({
  gelatoStoreProductIds: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!rateLimit(`admin-sync:${actorId ?? "anon"}`, 10, 60_000)) {
    res.status(429).json({ message: "Too many requests" })
    return
  }

  const body = BodySchema.parse(req.body ?? {})
  const catalog = req.scope.resolve(GELATO_CATALOG_MODULE) as GelatoCatalogService

  const result = await catalog.syncProducts(req.scope, {
    gelatoStoreProductIds: body.gelatoStoreProductIds,
    dryRun: body.dryRun,
    actor: actorId,
  })

  res.json(result)
}
