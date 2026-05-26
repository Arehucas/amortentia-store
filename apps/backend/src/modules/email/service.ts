import type { Logger } from "@medusajs/framework/types"

type EmailPayload = {
  to: string
  subject: string
  html: string
}

export default class EmailService {
  static identifier = "amortentiaEmail"

  private logger: Logger
  private apiKey?: string
  private from: string

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger
    this.apiKey = process.env.RESEND_API_KEY
    this.from = process.env.EMAIL_FROM ?? "Amortentia <pedidos@amortentia.local>"
  }

  async send(payload: EmailPayload) {
    if (!this.apiKey) {
      this.logger.info(
        `[email-mock] To: ${payload.to} | Subject: ${payload.subject}`
      )
      return { id: "mock-email", mocked: true }
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      this.logger.error(`[email] Resend error: ${text}`)
      return { error: text }
    }

    return response.json()
  }

  orderConfirmed(to: string, orderId: string) {
    return this.send({
      to,
      subject: "Tu pedido ha sido recibido — Amortentia",
      html: `<p>Hemos recibido tu pedido <strong>#${orderId}</strong>.</p><p>Lo enviaremos a producción en breve.</p>`,
    })
  }

  orderShipped(to: string, orderId: string, trackingUrl?: string) {
    return this.send({
      to,
      subject: "Tu pedido ha sido enviado — Amortentia",
      html: `<p>Tu pedido <strong>#${orderId}</strong> está en camino.</p>${
        trackingUrl
          ? `<p><a href="${trackingUrl}">Seguir envío</a></p>`
          : ""
      }`,
    })
  }
}
