import dynamic from 'next/dynamic'
const Viewer3D = dynamic(() => import('@/components/Viewer3D'), { ssr: false })

export default function LandingPage() {
  const modules = [
    { href: '/app/projects', title: 'Projects', desc: 'Create, manage, and version your PEB/LGS projects.' },
    { href: '/app/projects', title: 'Geometry', desc: 'Define spans, bays, slopes, heights, and openings.' },
    { href: '/app/projects', title: 'Loads', desc: 'Configure wind/seismic and generate load combinations.' },
    { href: '/app/projects', title: 'Analysis', desc: 'Run analysis in the cloud and track job status.' },
    { href: '/app/projects', title: 'Results', desc: 'Utilization, deflections, and member forces visualization.' },
    { href: '/app/projects', title: 'Connections', desc: 'Design typical steel connections (stubbed).' },
    { href: '/app/projects', title: 'Foundation', desc: 'Footings and anchor design (stubbed).' },
    { href: '/app/projects', title: 'Reports & Interop', desc: 'PDF, BOM, DXF, IFC, CIS/2.' },
  ]
  return (
    <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute -top-32 right-[-10%] -z-10 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-10%] -z-10 h-80 w-80 rounded-full bg-gradient-to-br from-teal-300/30 to-emerald-300/30 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-zinc-600">
            Cloud-native PEB & LGS Design
          </div>
          <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Design smarter steel buildings
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
            Model geometry, auto-generate loads, run analysis, and export reports — all in your browser.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a className="rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-3 text-white shadow hover:opacity-95" href="/app/projects">Open App</a>
            <a className="rounded-md border border-zinc-300 px-5 py-3 hover:border-indigo-300 hover:text-indigo-700" href="/signup">Get started</a>
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-center text-xl font-semibold">Modules</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600">
          Jump straight into any part of the workflow. Everything is versioned per project.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => (
            <a key={m.title} href={m.href} className="group rounded-xl border bg-white p-5 shadow-sm transition hover:shadow hover:border-indigo-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f472b6'][i%8]}} />
                  {m.title}
                </h3>
                <span className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">→</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{m.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Interactive demo */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-xl font-semibold">Try a quick demo</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600">Rotate and zoom a sample frame. Full editor inside the app.</p>
          <div className="mt-6">
            <Viewer3D />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-xl font-semibold">What engineers say</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[ 
              ['Cuts iteration time', '“We went from days to hours on PEB concepts.”', 'Principal, SE firm'],
              ['Confident outputs', '“Versioning + PDF makes submittals painless.”', 'Lead Engineer'],
              ['Seamless handoff', '“DXF/IFC export fits our detailing workflow.”', 'Fabricator'],
            ].map(([title, quote, by]) => (
        <div key={title} className="rounded-xl border bg-white p-5 shadow-sm hover:border-fuchsia-200">
                <div className="text-sm font-medium">{title}</div>
                <p className="mt-2 text-sm text-zinc-700">{quote}</p>
                <div className="mt-3 text-xs text-zinc-500">{by}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-xl font-semibold">Simple, transparent pricing</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { name: 'Free', price: '$0', features: ['1 project', 'Viewer + PDF (basic)'] },
              { name: 'Pro', price: '$39/mo', features: ['Unlimited projects', 'Optimization', 'Reports & DXF/IFC'] },
              { name: 'Enterprise', price: 'Contact', features: ['SSO', 'Priority support', 'Custom modules'] },
            ].map((p) => (
              <div key={p.name} className="rounded-xl border bg-white p-6 shadow-sm hover:border-teal-200">
                <div className="text-base font-semibold">{p.name}</div>
                <div className="mt-1 text-2xl">{p.price}</div>
                <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                  {p.features.map(f => <li key={f}>• {f}</li>)}
                </ul>
                <a href="/pricing" className="mt-5 inline-block rounded-md bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-white">Choose {p.name}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[ 
              ['Speed', 'GPU-accelerated 3D viewer and snappy UI.'],
              ['Accuracy', 'Code-informed load setup and consistent results.'],
              ['Collaboration', 'Share projects, track versions, and revert.'],
            ].map(([t,d]) => (
              <div key={t} className="rounded-xl border bg-white p-6 shadow-sm hover:border-indigo-200">
                <h3 className="text-base font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-zinc-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} ApexStruct
        </div>
      </footer>
    </main>
  )
}
