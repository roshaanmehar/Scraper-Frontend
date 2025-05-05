import type React from "react"

interface AppLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          backgroundColor: "#f0f0f0",
          padding: "1rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        <nav>
          <ul
            style={{
              display: "flex",
              listStyle: "none",
              margin: 0,
              padding: 0,
              gap: "1rem",
            }}
          >
            <li>
              <a
                href="/"
                style={{
                  fontWeight: activeTab === "home" ? "bold" : "normal",
                  textDecoration: "none",
                  color: activeTab === "home" ? "#3b82f6" : "#333",
                }}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/results"
                style={{
                  fontWeight: activeTab === "results" ? "bold" : "normal",
                  textDecoration: "none",
                  color: activeTab === "results" ? "#3b82f6" : "#333",
                }}
              >
                Results
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer
        style={{
          backgroundColor: "#f0f0f0",
          padding: "1rem",
          borderTop: "1px solid #ddd",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>GMB Scraper &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
