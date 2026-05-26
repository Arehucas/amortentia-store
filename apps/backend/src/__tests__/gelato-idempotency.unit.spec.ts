import { GelatoClient } from "@amortentia/gelato-client"
import { GELATO_STATUS_MAP } from "../modules/gelato/constants"

describe("Gelato MVP helpers", () => {
  it("mock client crea orden idempotente por referencia", async () => {
    const client = new GelatoClient({ mock: true })
    const payload = {
      orderReferenceId: "order_test_1",
      customerReferenceId: "user@test.com",
      currency: "EUR" as const,
      recipient: {
        firstName: "Ana",
        lastName: "Test",
        addressLine1: "Calle Mayor 1",
        city: "Madrid",
        postcode: "28001",
        country: "ES",
        email: "user@test.com",
      },
      items: [
        {
          itemReferenceId: "li_1",
          productUid: "mock_product_tee",
          quantity: 1,
          files: [{ type: "default", url: "https://example.com/print.png" }],
        },
      ],
    }

    const a = await client.createOrder(payload)
    const b = await client.createOrder(payload)
    expect(a.id).toBe(b.id)
  })

  it("mapea estados Gelato a estados internos", () => {
    expect(GELATO_STATUS_MAP.in_production).toBe("in_production")
    expect(GELATO_STATUS_MAP.shipped).toBe("shipped")
    expect(GELATO_STATUS_MAP.delivered).toBe("delivered")
    expect(GELATO_STATUS_MAP.failed).toBe("gelato_failed")
  })
})
