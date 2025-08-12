import './globals.css'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ToastProvider } from '@/components/Toast'
import ToastOnQuery from '@/components/ToastOnQuery'

export const metadata: Metadata = {
  title: 'ApexStruct – Intelligent Steel Design. In the Cloud.',
  description: 'Cloud-native PEB & LGS design platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en">
  <body className="min-h-screen bg-white text-zinc-900 antialiased">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm">
            <a href="/" className="font-semibold">ApexStruct</a>
            <nav className="flex items-center gap-4">
              <a href="/app" className="text-zinc-700 hover:underline">App</a>
              <a href="/app/projects" className="text-zinc-700 hover:underline">Projects</a>
              {!session && (
                <a href="/signin" className="text-zinc-700 hover:underline">Sign in</a>
              )}
              {session && (
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600">{session.user?.name || session.user?.email}</span>
                  <form action="/api/auth/signout" method="post">
                    <button className="text-zinc-700 underline">Sign out</button>
                  </form>
                </div>
              )}
            </nav>
          </div>
        </header>
        <ToastProvider>
          <ToastOnQuery />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
