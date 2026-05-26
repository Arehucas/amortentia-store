const steps = [
  {
    title: "Elige tu producto",
    description: "Camisetas, sudaderas o pósters con precio final en EUR.",
  },
  {
    title: "Compra segura",
    description: "Checkout con PayPal o pago manual en desarrollo.",
  },
  {
    title: "Producción bajo demanda",
    description: "Imprimimos tras confirmar el pago con nuestro partner Gelato.",
  },
  {
    title: "Envío a España",
    description: "Recibe tu pedido y consulta el tracking cuando esté disponible.",
  },
]

const HowItWorks = () => (
  <section className="content-container py-16">
    <h2 className="text-2xl font-semibold mb-8 text-center">Cómo funciona</h2>
    <div className="grid grid-cols-1 small:grid-cols-2 gap-8">
      {steps.map((step) => (
        <div key={step.title} className="border rounded-lg p-6 bg-white">
          <h3 className="font-medium mb-2">{step.title}</h3>
          <p className="text-ui-fg-subtle text-sm">{step.description}</p>
        </div>
      ))}
    </div>
  </section>
)

export default HowItWorks
