import { Module } from "@medusajs/framework/utils"
import GelatoService from "./service"

export const GELATO_MODULE = "gelato"

export default Module(GELATO_MODULE, {
  service: GelatoService,
})
