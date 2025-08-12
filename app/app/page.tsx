import Link from 'next/link'

export default function AppHome() {
  const cards = [
    { href: '/app/projects', title: 'Projects', desc: 'Browse, create, duplicate projects' },
    { href: '/app/projects', title: 'Geometry', desc: 'Edit spans, bays, slopes, heights' },
    { href: '/app/projects', title: 'Loads', desc: 'Wind/Seismic inputs and combinations' },
    { href: '/app/projects', title: 'Analysis', desc: 'Run analysis or optimization' },
    { href: '/app/projects', title: 'Results', desc: 'View UC, deflections, forces' },
    { href: '/app/projects', title: 'Connections', desc: 'Steel connection design (stub)' },
    { href: '/app/projects', title: 'Foundation', desc: 'Footings and anchors (stub)' },
    { href: '/app/projects', title: 'Reports & Interop', desc: 'PDF, BOM, DXF, IFC, CIS/2' },
  ]
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">App Hub</h1>
      <p className="mt-2 text-sm text-zinc-600">Pick a module to get started. Inside a project, these appear as tabs.</p>
      <div className="mt-6">
        <Link href="/app/projects" className="rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm text-white shadow">Open Projects</Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Link key={c.title} href={c.href as any} className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow hover:border-indigo-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f472b6'][i%8]}} />{c.title}</h3>
              <span className="text-zinc-400 group-hover:text-indigo-600">→</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
