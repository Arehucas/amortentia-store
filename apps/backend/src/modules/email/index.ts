import { Module } from "@medusajs/framework/utils"
import EmailService from "./service"

export const EMAIL_MODULE = "amortentiaEmail"

export default Module(EMAIL_MODULE, {
  service: EmailService,
})
