const { loadEnv } = require("@medusajs/framework/utils")

loadEnv("test", process.cwd())

module.exports = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript", decorators: true } },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts"],
  modulePathIgnorePatterns: ["dist/", ".medusa/"],
  testMatch: ["**/__tests__/**/*.unit.spec.ts"],
}
