import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/navbar"
import { ScraperProvider } from "@/context/scraper-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Scraper Dashboard",
  description: "Monitor and visualize your scraping operations in real-time",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ScraperProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
              <Navbar />
              <main>{children}</main>
            </div>
            <Toaster />
          </ScraperProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
