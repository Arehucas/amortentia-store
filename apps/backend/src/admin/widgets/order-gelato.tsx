import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"

type GelatoInfo = {
  gelato_order_id?: string
  status_internal?: string
  tracking_url?: string
  error?: string
}

const OrderGelatoWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const [info, setInfo] = useState<GelatoInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const res = await fetch(`/store/orders/${order.id}/gelato-status`, {
      credentials: "include",
    })
    if (res.ok) setInfo(await res.json())
  }

  useEffect(() => {
    load()
  }, [order.id])

  const retry = async () => {
    setLoading(true)
    await fetch(`/admin/gelato/orders/${order.id}/retry`, {
      method: "POST",
      credentials: "include",
    })
    await load()
    setLoading(false)
  }

  return (
    <Container className="p-4 space-y-3">
      <Heading level="h2">Gelato Fulfillment</Heading>
      <Text size="small">
        Estado: {info?.status_internal ?? order.metadata?.gelato_status ?? "—"}
      </Text>
      <Text size="small">
        Gelato Order ID: {info?.gelato_order_id ?? order.metadata?.gelato_order_id ?? "—"}
      </Text>
      {info?.tracking_url && (
        <a href={info.tracking_url} target="_blank" rel="noreferrer">
          Tracking
        </a>
      )}
      {info?.error && <Text className="text-ui-fg-error">{info.error}</Text>}
      <Button size="small" onClick={retry} isLoading={loading}>
        Reintentar envío a Gelato
      </Button>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderGelatoWidget
