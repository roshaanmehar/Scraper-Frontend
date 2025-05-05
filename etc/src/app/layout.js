import "./globals.css"

export const metadata = {
  title: "GMB Scraper",
  description: "Google My Business Scraper Application",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
