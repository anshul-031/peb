import { prisma } from '@/lib/prisma'

export async function getProjectRole(projectId: string, email?: string | null) {
  if (!email) return undefined
  const proj = await prisma.project.findFirst({
    where: { id: projectId },
    include: { owner: true, collaborators: { include: { user: true } } },
  })
  if (!proj) return undefined
  if (proj.owner.email === email) return 'OWNER'
  const collab = (proj.collaborators as Array<{ role: 'OWNER'|'EDITOR'|'VIEWER'; user: { email: string } }>).find(c => c.user.email === email)
  return collab?.role || undefined
}
