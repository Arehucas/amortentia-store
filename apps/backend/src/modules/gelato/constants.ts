export const GELATO_MODULE = "gelato"

export const GELATO_STATUS_MAP: Record<string, string> = {
  created: "sent_to_gelato",
  uploading: "sent_to_gelato",
  passed: "in_production",
  in_production: "in_production",
  printed: "in_production",
  shipped: "shipped",
  in_transit: "shipped",
  delivered: "delivered",
  failed: "gelato_failed",
  canceled: "gelato_failed",
}

export const USER_FACING_STATUS: Record<string, string> = {
  pending: "Pedido recibido",
  paid: "Pedido recibido",
  sent_to_gelato: "Pedido recibido",
  in_production: "En producción",
  shipped: "Enviado",
  delivered: "Entregado",
  gelato_failed: "Incidencia en el pedido",
  cancelled: "Cancelado",
}
