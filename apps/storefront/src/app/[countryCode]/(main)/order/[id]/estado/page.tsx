import { Metadata } from "next"
import { notFound } from "next/navigation"

type GelatoStatus = {
  order_id: string
  display_id: number
  status_user: string
  tracking_url?: string
  tracking_number?: string
  error?: string
}

async function getGelatoStatus(orderId: string): Promise<GelatoStatus | null> {
  const backend = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (!backend) return null

  const res = await fetch(`${backend}/store/orders/${orderId}/gelato-status`, {
    headers: key ? { "x-publishable-api-key": key } : {},
    cache: "no-store",
  })

  if (!res.ok) return null
  return res.json()
}

export const metadata: Metadata = {
  title: "Estado del pedido | Amortentia",
  description: "Consulta el estado de tu pedido print on demand.",
}

export default async function OrderStatusPage(props: {
  params: Promise<{ id: string; countryCode: string }>
}) {
  const { id } = await props.params
  const status = await getGelatoStatus(id)

  if (!status) {
    notFound()
  }

  return (
    <div className="content-container py-16 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Estado del pedido</h1>
      <p className="text-ui-fg-subtle mb-8">
        Pedido #{status.display_id ?? status.order_id}
      </p>

      <div className="border rounded-lg p-6 space-y-4 bg-white">
        <p className="text-lg font-medium">{status.status_user}</p>

        {status.tracking_url && (
          <a
            href={status.tracking_url}
            className="text-ui-fg-interactive underline"
            target="_blank"
            rel="noreferrer"
          >
            Seguir envío
            {status.tracking_number ? ` (${status.tracking_number})` : ""}
          </a>
        )}

        {status.error && (
          <p className="text-ui-fg-error text-sm">
            Hemos detectado una incidencia. Nuestro equipo la revisará.
          </p>
        )}
      </div>
    </div>
  )
}
