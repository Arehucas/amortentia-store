import { CreateGelatoOrderSchema, type CreateGelatoOrderInput, type GelatoStoreProduct } from "./types.js"
import { mockCreateOrder, mockListStoreProducts } from "./mock.js"

export type GelatoClientOptions = {
  apiKey?: string
  storeId?: string
  mock?: boolean
  ordersBaseUrl?: string
  ecommerceBaseUrl?: string
}

export class GelatoClient {
  private apiKey?: string
  private storeId?: string
  private mock: boolean
  private ordersBaseUrl: string
  private ecommerceBaseUrl: string

  constructor(options: GelatoClientOptions = {}) {
    this.apiKey = options.apiKey
    this.storeId = options.storeId
    this.mock = options.mock ?? !options.apiKey
    this.ordersBaseUrl = options.ordersBaseUrl ?? "https://order.gelatoapis.com/v4"
    this.ecommerceBaseUrl =
      options.ecommerceBaseUrl ?? "https://ecommerce.gelatoapis.com/v1"
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.apiKey ? { "X-API-KEY": this.apiKey } : {}),
    }

    const response = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Gelato API error ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  async createOrder(input: CreateGelatoOrderInput) {
    const payload = CreateGelatoOrderSchema.parse(input)

    if (this.mock) {
      return mockCreateOrder(payload)
    }

    return this.request<{ id: string; status?: string; fulfillmentStatus?: string }>(
      `${this.ordersBaseUrl}/orders`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async listStoreProducts(): Promise<GelatoStoreProduct[]> {
    if (this.mock || !this.storeId) {
      return mockListStoreProducts()
    }

    const data = await this.request<{ products?: GelatoStoreProduct[] }>(
      `${this.ecommerceBaseUrl}/stores/${this.storeId}/products`
    )

    return data.products ?? []
  }

  async getStoreProduct(productId: string): Promise<GelatoStoreProduct | null> {
    if (this.mock) {
      return mockListStoreProducts().find((p) => p.id === productId) ?? null
    }

    if (!this.storeId) return null

    return this.request<GelatoStoreProduct>(
      `${this.ecommerceBaseUrl}/stores/${this.storeId}/products/${productId}`
    )
  }
}
