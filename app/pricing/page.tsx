export default function PricingPage() {
  const plans = [
    { name: 'Free', price: '$0', features: ['1 project', 'Viewer + basic PDF', 'Email support'] },
    { name: 'Pro', price: '$39/mo', features: ['Unlimited projects', 'Optimization engine', 'Reports, DXF/IFC exports'] },
    { name: 'Enterprise', price: 'Contact', features: ['SSO', 'Priority support', 'Custom modules & onboarding'] },
  ]
  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="text-2xl font-semibold text-center">Pricing</h1>
      <p className="text-center text-sm text-zinc-600 mt-2">Choose a plan that fits your team.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map(p => (
          <div key={p.name} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-base font-semibold">{p.name}</div>
            <div className="mt-1 text-2xl">{p.price}</div>
            <ul className="mt-3 space-y-1 text-sm text-zinc-600">
              {p.features.map(f => <li key={f}>• {f}</li>)}
            </ul>
            <a href="/signup" className="mt-5 inline-block rounded-md bg-zinc-900 px-4 py-2 text-white">Get started</a>
          </div>
        ))}
      </div>
    </div>
  )
}
