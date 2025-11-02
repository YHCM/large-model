import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 聊天',
  description: '简单的 AI 聊天页面',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
