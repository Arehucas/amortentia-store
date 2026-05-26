import { Button, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-rose-950">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <span>
          <Heading
            level="h1"
            className="text-4xl leading-tight text-white font-semibold"
          >
            Amortentia
          </Heading>
          <Heading
            level="h2"
            className="text-xl leading-8 text-neutral-200 font-normal mt-4 max-w-xl"
          >
            Print on demand con precios claros. Fabricamos tras tu compra y
            enviamos desde España.
          </Heading>
        </span>
        <LocalizedClientLink href="/store">
          <Button variant="secondary" size="large">
            Ver catálogo
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
