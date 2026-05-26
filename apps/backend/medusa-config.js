require("ts-node/register/transpile-only")

const { loadEnv, defineConfig } = require("@medusajs/framework/utils")

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    { resolve: "./src/modules/gelato-persistence/index.ts" },
    { resolve: "./src/modules/gelato/index.ts" },
    { resolve: "./src/modules/gelato-catalog/index.ts" },
    { resolve: "./src/modules/email/index.ts" },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/paypal/index.ts",
            id: "paypal",
            options: {
              client_id: process.env.PAYPAL_CLIENT_ID,
              client_secret: process.env.PAYPAL_CLIENT_SECRET,
              environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
              autoCapture: process.env.PAYPAL_AUTO_CAPTURE === "true",
              webhook_id: process.env.PAYPAL_WEBHOOK_ID,
            },
          },
        ],
      },
    },
  ],
})
