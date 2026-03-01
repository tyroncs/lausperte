import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'laŭsperte',
  description: 'Ni taksu la plej bonajn eventojn en Esperantujo, laŭsperte',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="eo">
      <body>
        <nav className="bg-emerald-800 text-white">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/" className="text-lg font-bold hover:text-emerald-200 transition-colors">
              laŭsperte
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pri" className="text-sm font-medium hover:text-emerald-200 transition-colors">
                Pri
              </Link>
              <Link href="/donu" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg transition-colors">
                Kontribuu
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
