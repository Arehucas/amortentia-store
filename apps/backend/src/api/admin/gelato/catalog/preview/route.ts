import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GELATO_MODULE } from "../../../../../modules/gelato"
import type GelatoService from "../../../../../modules/gelato/service"
import { rateLimit } from "../../../../../lib/rate-limit"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!rateLimit(`admin-preview:${actorId ?? "anon"}`, 30, 60_000)) {
    res.status(429).json({ message: "Too many requests" })
    return
  }

  const gelato = req.scope.resolve(GELATO_MODULE) as GelatoService
  const products = await gelato.listGelatoProducts()
  res.json({ products })
}
