import ProjectTabs from '@/components/project/Tabs'

export default function ProjectLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <ProjectTabs id={params.id} />
      <div className="mt-6">{children}</div>
    </section>
  )
}
