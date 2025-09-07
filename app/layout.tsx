import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { OfflineBanner } from '@/components/OfflineBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RestoPOS - Restaurant Management System',
  description: 'Complete restaurant POS system with multi-tenant support',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OfflineBanner />
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}