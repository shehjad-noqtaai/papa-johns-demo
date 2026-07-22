import type {Metadata} from 'next'
import './globals.css'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Papa Johns — Menu Hierarchy Demo',
  description:
    'Global → market → store menu inheritance resolved from Sanity delta documents',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 antialiased">
        {children}
        <Footer />
      </body>
    </html>
  )
}
