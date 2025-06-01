import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta'
})

const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp'
})

export const metadata: Metadata = {
  title: 'レビバコ - あなただけのレビュー空間',
  description: 'ユーザー独自のレビュー空間を作れるサービス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${plusJakarta.variable} ${notoSansJP.variable} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}