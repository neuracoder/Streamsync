import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Script from 'next/script'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'StreamSync - Premium YouTube Player',
  description: 'Modern PWA for YouTube video and audio streaming with background playback',
  generator: 'v0.app',
  manifest: '/manifest.json',
  keywords: ['youtube', 'music', 'video', 'streaming', 'pwa', 'background playback'],
  authors: [{ name: 'StreamSync' }],
  icons: {
    icon: [
      {
        url: '/icon-192.jpg',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.jpg',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: '/icon-512.jpg',
  },
}

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                  (registration) => {
                    console.log('[v0] ServiceWorker registered:', registration.scope);
                  },
                  (err) => {
                    console.log('[v0] ServiceWorker registration failed:', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
