"use client"

import { Home, Mail, MapPin, BarChart2, List, Download, Sun, Moon, Loader, Terminal } from "lucide-react"
import { useRipple } from "@/hooks/useRipple"
import { useLogStore } from "@/stores/logStore"
import styles from "@/styles/layout/Navbar.module.css"

interface NavbarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isRunning: boolean
  isEmailScraping: boolean
  isPostcodeScraping: boolean
  totalCards: number
  toggleTheme: () => void
  isDarkMode: boolean
}

export default function Navbar({
  activeTab,
  setActiveTab,
  isRunning,
  isEmailScraping,
  isPostcodeScraping,
  totalCards,
  toggleTheme,
  isDarkMode,
}: NavbarProps) {
  const { createRipple } = useRipple()
  const { addLog } = useLogStore()

  const exportData = () => {
    addLog("Exporting data...")
    // Simulate export delay
    setTimeout(() => {
      addLog("Data exported successfully")

      // Create and download a mock CSV file
      const mockData = generateMockCSVData(totalCards)
      const blob = new Blob([mockData], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "gmb_scraper_export.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, 1500)
  }

  // Generate mock CSV data for export
  const generateMockCSVData = (count: number) => {
    const header = "Business Name,Address,Phone,Website,Email,Category\n"
    let rows = ""

    const categories = [
      "Restaurant",
      "Cafe",
      "Bar",
      "Hotel",
      "Retail",
      "Supermarket",
      "Gym",
      "Salon",
      "Dentist",
      "Mechanic",
    ]

    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const businessName = `${category} Business ${i}`
      const address = `${Math.floor(Math.random() * 200) + 1} Main Street, City`
      const phone = `+44 ${Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(10, "0")}`
      const website = `https://www.business${i}.com`
      const email = Math.random() > 0.3 ? `info@business${i}.com` : ""

      rows += `"${businessName}","${address}","${phone}","${website}","${email}","${category}"\n`
    }

    return header + rows
  }

  return (
    <div className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <Terminal className={styles.titleIcon} />
        <h1 className={styles.title}>GMB Scraper</h1>
      </div>

      <div className={styles.navTabs}>
        <button
          className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`}
          onClick={(e) => {
            setActiveTab("home")
            createRipple(e)
          }}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          className={`${styles.navTab} ${activeTab === "emails" ? styles.activeNavTab : ""}`}
          onClick={(e) => {
            setActiveTab("emails")
            createRipple(e)
          }}
        >
          <Mail size={18} />
          <span>Emails</span>
        </button>

        <button
          className={`${styles.navTab} ${activeTab === "postcodes" ? styles.activeNavTab : ""}`}
          onClick={(e) => {
            setActiveTab("postcodes")
            createRipple(e)
          }}
        >
          <MapPin size={18} />
          <span>Postcodes</span>
        </button>

        <button
          className={`${styles.navTab} ${activeTab === "dashboard" ? styles.activeNavTab : ""}`}
          onClick={(e) => {
            setActiveTab("dashboard")
            createRipple(e)
          }}
        >
          <BarChart2 size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`${styles.navTab} ${activeTab === "tasks" ? styles.activeNavTab : ""}`}
          onClick={(e) => {
            setActiveTab("tasks")
            createRipple(e)
          }}
        >
          <div className={styles.tabIconWrapper}>
            <List size={18} />
            {(isRunning || isEmailScraping || isPostcodeScraping) && (
              <div className={styles.spinnerBadge}>
                <Loader size={10} />
              </div>
            )}
          </div>
          <span>Tasks</span>
        </button>
      </div>

      <div className={styles.navActions}>
        {totalCards > 0 && (
          <button
            className={styles.exportButton}
            onClick={(e) => {
              exportData()
              createRipple(e)
            }}
            title="Export Data"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
        )}

        <button
          className={styles.themeToggle}
          onClick={(e) => {
            toggleTheme()
            createRipple(e)
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  )
}
