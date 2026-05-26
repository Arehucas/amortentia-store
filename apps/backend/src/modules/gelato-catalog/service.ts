import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { GELATO_MODULE } from "../gelato"
import type GelatoService from "../gelato/service"
import { GELATO_PERSISTENCE_MODULE } from "../gelato-persistence"
import type GelatoPersistenceService from "../gelato-persistence/service"

const PRINT_FILE_PLACEHOLDER =
  "https://placehold.co/1200x1200/png?text=Amortentia+Print"

const MVP_PRICES: Record<string, number> = {
  tee: 2499,
  camiseta: 2499,
  hoodie: 4999,
  sudadera: 4999,
  poster: 1999,
  "póster": 1999,
}

function inferPriceCents(title: string): number {
  const lower = title.toLowerCase()
  for (const [key, price] of Object.entries(MVP_PRICES)) {
    if (lower.includes(key)) return price
  }
  return 2499
}

export default class GelatoCatalogService {
  static identifier = "gelatoCatalog"

  async syncProducts(
    container: MedusaContainer,
    input: {
      gelatoStoreProductIds?: string[]
      dryRun?: boolean
      actor?: string
    }
  ) {
    const gelato = container.resolve(GELATO_MODULE) as GelatoService
    const persistence = container.resolve(
      GELATO_PERSISTENCE_MODULE
    ) as GelatoPersistenceService
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    await persistence.ensureSchema()
    const syncLog = await persistence.startCatalogSync("products")

    let created = 0
    let updated = 0
    let skipped = 0

    try {
      const gelatoProducts = await gelato.listGelatoProducts()
      const selected = input.gelatoStoreProductIds?.length
        ? gelatoProducts.filter((p) => input.gelatoStoreProductIds!.includes(p.id))
        : gelatoProducts

      for (const gp of selected) {
        const handle = `gelato-${gp.id}`.toLowerCase().replace(/[^a-z0-9-]/g, "-")
        const { data: existingProducts } = await query.graph({
          entity: "product",
          fields: ["id", "handle", "metadata"],
          filters: { handle },
        })

        const existing = existingProducts?.[0]
        if (input.dryRun) {
          existing ? updated++ : created++
          continue
        }

        const variants =
          gp.variants?.map((v) => ({
            title: v.title,
            sku: `gelato-${v.id}`,
            manage_inventory: false,
            prices: [
              {
                amount: inferPriceCents(gp.title),
                currency_code: "eur",
              },
            ],
            metadata: {
              gelato_variant_id: v.id,
              gelato_product_uid: v.productUid,
              print_file_url: PRINT_FILE_PLACEHOLDER,
              import_source: "gelato",
            },
          })) ?? [
            {
              title: "Default",
              sku: `gelato-${gp.id}-default`,
              manage_inventory: false,
              prices: [
                {
                  amount: inferPriceCents(gp.title),
                  currency_code: "eur",
                },
              ],
              metadata: {
                gelato_product_uid: gp.productUid ?? gp.id,
                print_file_url: PRINT_FILE_PLACEHOLDER,
                import_source: "gelato",
              },
            },
          ]

        const productData = {
          title: gp.title,
          handle,
          description: gp.description ?? "",
          status: ProductStatus.DRAFT,
          thumbnail: gp.previewUrl,
          metadata: {
            gelato_product_uid: gp.productUid ?? gp.id,
            gelato_store_product_id: gp.id,
            import_source: "gelato",
            last_gelato_sync_at: new Date().toISOString(),
          },
          variants,
          options: variants.length > 1 ? [{ title: "Talla", values: variants.map((v) => v.title) }] : [],
        }

        if (existing) {
          const { updateProductsWorkflow } = await import(
            "@medusajs/medusa/core-flows"
          )
          await updateProductsWorkflow(container).run({
            input: { products: [{ id: existing.id, ...productData }] },
          })
          updated++
        } else {
          await createProductsWorkflow(container).run({
            input: { products: [productData] },
          })
          created++
        }
      }

      await persistence.finishCatalogSync(syncLog.id, {
        status: "completed",
        itemsCreated: created,
        itemsUpdated: updated,
        itemsSkipped: skipped,
      })

      await persistence.audit("import_gelato_catalog", input.actor, undefined, {
        dryRun: input.dryRun,
        created,
        updated,
        skipped,
      })

      return { created, updated, skipped, dryRun: !!input.dryRun }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error importando catálogo"
      await persistence.finishCatalogSync(syncLog.id, {
        status: "failed",
        itemsCreated: created,
        itemsUpdated: updated,
        itemsSkipped: skipped,
        errorMessage: message,
      })
      throw err
    }
  }

  async syncCategories(container: MedusaContainer, input: { dryRun?: boolean }) {
    const persistence = container.resolve(
      GELATO_PERSISTENCE_MODULE
    ) as GelatoPersistenceService
    const syncLog = await persistence.startCatalogSync("categories")

    // MVP: colección única "Gelato Import"
    const created = input.dryRun ? 0 : 1
    await persistence.finishCatalogSync(syncLog.id, {
      status: "completed",
      itemsCreated: created,
      itemsUpdated: 0,
      itemsSkipped: 0,
    })

    return {
      message: "Categorías Gelato mapeadas a colección Medusa en MVP simplificado",
      created,
    }
  }
}
