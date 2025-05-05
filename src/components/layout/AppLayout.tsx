import type React from "react"

export default function AppLayout({
  children,
  activeTab = "home",
}: {
  children: React.ReactNode
  activeTab?: string
}) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>GMB Scraper</h1>
        <nav>
          <ul>
            <li className={activeTab === "home" ? "active" : ""}>Home</li>
            <li className={activeTab === "results" ? "active" : ""}>Results</li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
