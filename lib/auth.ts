import { getServerSession } from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'Email & Password',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null
        const user = await prisma.user.findUnique({ where: { email: creds.email } })
        if (!user?.passwordHash) return null
        const ok = await compare(creds.password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name || undefined }
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id
      return token
    },
    async session({ session, token }) {
      if (session?.user && token?.id) {
        ;(session.user as any).id = token.id as string
      }
      return session
    },
  },
}

export function getSession() {
  return getServerSession(authOptions)
}
