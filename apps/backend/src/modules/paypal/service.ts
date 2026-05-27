import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

type Options = {
  client_id?: string
  client_secret?: string
  environment?: "sandbox" | "production"
  autoCapture?: boolean
  webhook_id?: string
}

type InjectedDependencies = {
  logger: Logger
}

export default class PayPalPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "paypal"

  protected logger_: Logger
  protected options_: Options
  protected mockMode_: boolean

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = {
      environment: "sandbox",
      autoCapture: true,
      ...options,
    }
    this.mockMode_ =
      (process.env.NODE_ENV === "development" ||
        process.env.PAYPAL_MOCK === "true") &&
      (!this.options_.client_id || !this.options_.client_secret)
  }

  static validateOptions(options: Record<string, unknown>): void {
    const isDev = process.env.NODE_ENV === "development"
    const isMock = process.env.PAYPAL_MOCK === "true"
    if ((isDev || isMock) && (!options.client_id || !options.client_secret)) {
      return
    }
    if (!options.client_id || !options.client_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayPal client_id y client_secret son obligatorios en producción"
      )
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    if (this.mockMode_) {
      return {
        id: `mock-paypal-${input.context?.idempotency_key ?? Date.now()}`,
        data: {
          mock: true,
          status: "requires_capture",
          amount: input.amount,
          currency_code: input.currency_code,
        },
        status: PaymentSessionStatus.PENDING,
      }
    }

    return {
      id: `paypal-pending-${input.context?.idempotency_key}`,
      data: {
        message: "Configura credenciales PayPal para pagos reales",
        amount: input.amount,
        currency_code: input.currency_code,
      },
      status: PaymentSessionStatus.PENDING,
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    if (this.mockMode_ || input.data?.mock) {
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: { ...input.data, authorized: true },
      }
    }
    return { status: PaymentSessionStatus.AUTHORIZED, data: input.data }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    if (this.mockMode_ || input.data?.mock) {
      return {
        data: { ...input.data, captured: true },
      }
    }
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    if (input.data?.captured) {
      return { status: PaymentSessionStatus.CAPTURED }
    }
    if (input.data?.authorized) {
      return { status: PaymentSessionStatus.AUTHORIZED }
    }
    return { status: PaymentSessionStatus.PENDING }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(_data: {
    data: Record<string, unknown>
    rawData: string | Buffer
    headers: Record<string, unknown>
  }): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED } as WebhookActionResult
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      data: { ...input.data, amount: input.amount, currency_code: input.currency_code },
    }
  }
}
