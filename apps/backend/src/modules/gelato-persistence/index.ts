import { Module } from "@medusajs/framework/utils"
import GelatoPersistenceService from "./service"

export const GELATO_PERSISTENCE_MODULE = "gelatoPersistence"

export default Module(GELATO_PERSISTENCE_MODULE, {
  service: GelatoPersistenceService,
})
