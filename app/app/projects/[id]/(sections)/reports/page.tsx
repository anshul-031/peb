import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function ReportsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return <div className="text-center py-10">Please sign in to view this project.</div>
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.id,
      OR: [
        { owner: { email: session.user.email } },
        { collaborators: { some: { user: { email: session.user.email } } } },
      ],
    },
    select: { id: true },
  })

  if (!project) {
    return <div className="text-center py-10">Project not found or access denied.</div>
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Reports</h2>
      <p className="text-sm text-gray-600 mt-2">Generate a PDF report for this project.</p>
      <div className="mt-4 flex gap-3 flex-wrap">
        <a
          className="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          href={`/api/reports/pdf?projectId=${project.id}`}
        >
          Download PDF
        </a>
        <a
          className="inline-flex items-center rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
          href={`/api/reports/pdf?projectId=${project.id}&type=bom`}
        >
          Download BOM PDF
        </a>
        <a
          className="inline-flex items-center rounded bg-teal-600 px-3 py-2 text-white hover:bg-teal-700"
          href={`/api/bom?projectId=${project.id}`}
        >
          Download BOM CSV
        </a>
        <a
          className="inline-flex items-center rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
          href={`/api/drawings/dxf?projectId=${project.id}`}
        >
          Export DXF
        </a>
        <a
          className="inline-flex items-center rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
          href={`/api/interop/ifc/export?projectId=${project.id}`}
        >
          Export IFC (stub)
        </a>
        <a
          className="inline-flex items-center rounded bg-fuchsia-600 px-3 py-2 text-white hover:bg-fuchsia-700"
          href={`/api/interop/cis2/export?projectId=${project.id}`}
        >
          Export CIS/2 (stub)
        </a>
        <div className="w-full" />
        <a
          className="inline-flex items-center rounded bg-teal-600 px-3 py-2 text-white hover:bg-teal-700"
          href={`/api/drawings/dxf?projectId=${project.id}&sheet=anchor`}
        >
          DXF: Anchor Plan
        </a>
        <a
          className="inline-flex items-center rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
          href={`/api/drawings/dxf?projectId=${project.id}&sheet=frame-elev`}
        >
          DXF: Frame Elevation
        </a>
        <a
          className="inline-flex items-center rounded bg-cyan-600 px-3 py-2 text-white hover:bg-cyan-700"
          href={`/api/drawings/dxf?projectId=${project.id}&sheet=roof-plan`}
        >
          DXF: Roof Plan
        </a>
      </div>
    </div>
  )
}
