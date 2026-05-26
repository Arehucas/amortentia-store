import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Table, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type GelatoProduct = { id: string; title: string }
type LogResponse = {
  webhooks: Array<{ event_type: string; processed: boolean; created_at: string }>
  catalogSync: Array<{ sync_type: string; status: string; started_at: string }>
}

const GelatoAdminPage = () => {
  const [products, setProducts] = useState<GelatoProduct[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [logs, setLogs] = useState<LogResponse | null>(null)
  const [message, setMessage] = useState("")

  const loadPreview = async () => {
    const res = await fetch("/admin/gelato/catalog/preview", { credentials: "include" })
    const data = await res.json()
    setProducts(data.products ?? [])
  }

  const loadLogs = async () => {
    const res = await fetch("/admin/gelato/logs", { credentials: "include" })
    if (res.ok) setLogs(await res.json())
  }

  useEffect(() => {
    loadPreview()
    loadLogs()
  }, [])

  const syncProducts = async (dryRun = false) => {
    const res = await fetch("/admin/gelato/catalog/sync-products", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gelatoStoreProductIds: selected.length ? selected : undefined,
        dryRun,
      }),
    })
    const data = await res.json()
    setMessage(JSON.stringify(data))
    await loadLogs()
  }

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Heading level="h1">Gelato — Importar catálogo</Heading>
      <Container className="p-4 space-y-3">
        <Heading level="h2">Productos disponibles (preview)</Heading>
        <div className="space-y-2">
          {products.map((p) => (
            <label key={p.id} className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              <Text>{p.title}</Text>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => syncProducts(true)} variant="secondary">
            Dry-run import
          </Button>
          <Button onClick={() => syncProducts(false)}>Sync productos</Button>
          <Button
            onClick={async () => {
              await fetch("/admin/gelato/catalog/sync-categories", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              })
              await loadLogs()
            }}
            variant="secondary"
          >
            Sync categorías
          </Button>
        </div>
        {message && <Text size="small">{message}</Text>}
      </Container>

      <Container className="p-4">
        <Heading level="h2">Logs</Heading>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Fecha</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {logs?.catalogSync?.map((row, i) => (
              <Table.Row key={`cs-${i}`}>
                <Table.Cell>{row.sync_type}</Table.Cell>
                <Table.Cell>{row.status}</Table.Cell>
                <Table.Cell>{row.started_at}</Table.Cell>
              </Table.Row>
            ))}
            {logs?.webhooks?.slice(0, 10).map((row, i) => (
              <Table.Row key={`wh-${i}`}>
                <Table.Cell>{row.event_type}</Table.Cell>
                <Table.Cell>{row.processed ? "ok" : "pending"}</Table.Cell>
                <Table.Cell>{row.created_at}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Gelato",
})

export default GelatoAdminPage
