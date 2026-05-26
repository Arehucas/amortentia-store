import { Module } from "@medusajs/framework/utils"
import GelatoCatalogService from "./service"

export const GELATO_CATALOG_MODULE = "gelatoCatalog"

export default Module(GELATO_CATALOG_MODULE, {
  service: GelatoCatalogService,
})
