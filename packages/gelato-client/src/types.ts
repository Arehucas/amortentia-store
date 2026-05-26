import { z } from "zod"

export const GelatoRecipientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().length(2),
  email: z.string().email(),
})

export const GelatoOrderItemSchema = z.object({
  itemReferenceId: z.string().min(1),
  productUid: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  files: z.array(
    z.object({
      type: z.string(),
      url: z.string().url(),
    })
  ),
})

export const CreateGelatoOrderSchema = z.object({
  orderReferenceId: z.string().min(1),
  customerReferenceId: z.string().min(1),
  currency: z.literal("EUR"),
  recipient: GelatoRecipientSchema,
  items: z.array(GelatoOrderItemSchema).min(1),
})

export type CreateGelatoOrderInput = z.infer<typeof CreateGelatoOrderSchema>

export type GelatoStoreProduct = {
  id: string
  title: string
  description?: string
  previewUrl?: string
  productUid?: string
  variants?: Array<{
    id: string
    title: string
    productUid: string
    previewUrl?: string
  }>
}

export type GelatoWebhookPayload = {
  event?: string
  id?: string
  orderId?: string
  orderReferenceId?: string
  fulfillmentStatus?: string
  trackingCode?: string
  trackingUrl?: string
  carrier?: string
}
