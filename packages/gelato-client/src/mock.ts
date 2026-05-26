import type { CreateGelatoOrderInput, GelatoStoreProduct } from "./types.js"

export function mockCreateOrder(input: CreateGelatoOrderInput) {
  const gelatoOrderId = `mock-gelato-${input.orderReferenceId}`
  return {
    id: gelatoOrderId,
    orderReferenceId: input.orderReferenceId,
    status: "created",
    fulfillmentStatus: "created",
  }
}

export function mockListStoreProducts(): GelatoStoreProduct[] {
  return [
    {
      id: "mock-store-product-tee",
      title: "Camiseta básica POD",
      description: "Camiseta unisex print on demand",
      previewUrl: "https://placehold.co/600x600?text=Camiseta",
      productUid: "mock_product_tee",
      variants: [
        { id: "mock-var-tee-s", title: "S", productUid: "mock_product_tee_s" },
        { id: "mock-var-tee-m", title: "M", productUid: "mock_product_tee_m" },
        { id: "mock-var-tee-l", title: "L", productUid: "mock_product_tee_l" },
      ],
    },
    {
      id: "mock-store-product-hoodie",
      title: "Sudadera POD",
      previewUrl: "https://placehold.co/600x600?text=Sudadera",
      productUid: "mock_product_hoodie",
      variants: [
        { id: "mock-var-hoodie-m", title: "M", productUid: "mock_product_hoodie_m" },
      ],
    },
    {
      id: "mock-store-product-poster",
      title: "Póster POD",
      previewUrl: "https://placehold.co/600x600?text=Poster",
      productUid: "mock_product_poster",
      variants: [
        { id: "mock-var-poster-a4", title: "A4", productUid: "mock_product_poster_a4" },
      ],
    },
  ]
}
