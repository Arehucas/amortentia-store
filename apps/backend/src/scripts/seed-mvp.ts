import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

const PRINT_URL = "https://placehold.co/1200x1200/png?text=Amortentia"

const MVP_PRODUCTS = [
  {
    title: "Camiseta básica POD",
    handle: "camiseta-basica",
    price: 2499,
    gelato_product_uid: "mock_product_tee",
    variants: ["S", "M", "L"],
  },
  {
    title: "Sudadera POD",
    handle: "sudadera-pod",
    price: 4999,
    gelato_product_uid: "mock_product_hoodie",
    variants: ["M", "L"],
  },
  {
    title: "Póster POD",
    handle: "poster-pod",
    price: 1999,
    gelato_product_uid: "mock_product_poster",
    variants: ["A4", "A3"],
  },
]

export default async function seedMvp({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  logger.info("[seed-mvp] Iniciando seed Amortentia (ES / EUR)...")

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })

  if (existingProducts?.length >= 3) {
    logger.info("[seed-mvp] Productos ya existen, omitiendo creación.")
    return
  }

  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: "Amortentia Store" }],
    },
  })

  const {
    result: [publishableKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Amortentia Publishable", type: "publishable", created_by: "" }],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableKey.id, add: [salesChannel.id] },
  })

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "España",
          currency_code: "eur",
          countries: ["es"],
          payment_providers: ["pp_paypal_paypal", "pp_system_default"],
        },
      ],
    },
  })

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "es", provider_id: "tp_system" }],
  })

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "España POD",
          address: { city: "Madrid", country_code: "es", address_1: "N/A" },
        },
      ],
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  const fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
    name: "España envío",
    type: "shipping",
    service_zones: [
      {
        name: "España",
        geo_zones: [{ country_code: "es", type: "country" }],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Envío estándar España",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfiles[0].id,
        type: {
          label: "Estándar",
          description: "5-10 días laborables",
          code: "standard",
        },
        prices: [
          { currency_code: "eur", amount: 499 },
          { region_id: region.id, amount: 499 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  const products = MVP_PRODUCTS.map((p) => ({
    title: p.title,
    handle: p.handle,
    status: ProductStatus.PUBLISHED,
    description:
      "Producto fabricado bajo demanda. Se produce tras la compra y se envía desde nuestro partner de impresión.",
    metadata: {
      gelato_product_uid: p.gelato_product_uid,
      import_source: "seed",
      seo_title: `${p.title} | Amortentia`,
      seo_description: `Compra ${p.title} con envío en España.`,
    },
    options: [{ title: "Talla", values: p.variants }],
    variants: p.variants.map((size) => ({
      title: size,
      sku: `${p.handle}-${size.toLowerCase()}`,
      manage_inventory: false,
      options: { Talla: size },
      prices: [{ amount: p.price, currency_code: "eur" }],
      metadata: {
        gelato_product_uid: p.gelato_product_uid,
        gelato_variant_id: `${p.gelato_product_uid}_${size.toLowerCase()}`,
        print_file_url: PRINT_URL,
        size,
      },
    })),
  }))

  await createProductsWorkflow(container).run({ input: { products } })

  logger.info(
    `[seed-mvp] Completado. Publishable API Key: ${publishableKey.id} — configura NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
  )
}
