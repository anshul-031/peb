"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: (id: string) => `/app/projects/${id}`, label: 'Geometry' },
  { href: (id: string) => `/app/projects/${id}/loads`, label: 'Loads' },
  { href: (id: string) => `/app/projects/${id}/results`, label: 'Results' },
  { href: (id: string) => `/app/projects/${id}/connections`, label: 'Connections' },
  { href: (id: string) => `/app/projects/${id}/foundation`, label: 'Foundation' },
  { href: (id: string) => `/app/projects/${id}/versions`, label: 'Versions' },
  { href: (id: string) => `/app/projects/${id}/reports`, label: 'Reports' },
  { href: (id: string) => `/app/projects/${id}/drawings`, label: 'Drawings' },
  { href: (id: string) => `/app/projects/${id}/interop`, label: 'Interoperability' },
]

export default function ProjectTabs({ id }: { id: string }) {
  const pathname = usePathname()
  return (
    <div className="mt-6 flex flex-wrap gap-2 border-b pb-2">
      {tabs.map(t => {
        const href = t.href(id)
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href as any} className={`relative rounded-full px-3 py-1 text-sm hover:bg-zinc-100 ${active ? 'text-zinc-900' : 'text-zinc-600'}`}>
            <span>{t.label}</span>
            {active && <span className="absolute left-1/2 -bottom-2 h-0.5 w-6 -translate-x-1/2 rounded bg-zinc-900" />}
          </Link>
        )
      })}
    </div>
  )
}
