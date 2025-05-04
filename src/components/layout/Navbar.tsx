"use client"

import Link from "next/link"
import { Home, Database, Sun, Moon } from "lucide-react"
import styles from "@/styles/layout/Navbar.module.css"

interface NavbarProps {
  activeTab: string
  isDarkMode: boolean
  toggleTheme: () => void
}

export default function Navbar({ activeTab, isDarkMode, toggleTheme }: NavbarProps) {
  return (
    <div className={styles.navbar}>
      <div className={styles.navbarBrand}>
        <h1 className={styles.title}>GMB Scraper</h1>
      </div>

      <div className={styles.navTabs}>
        <Link href="/" className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`}>
          <Home size={18} />
          <span>Home</span>
        </Link>

        <Link href="/results" className={`${styles.navTab} ${activeTab === "results" ? styles.activeNavTab : ""}`}>
          <Database size={18} />
          <span>Results</span>
        </Link>
      </div>

      <div className={styles.navActions}>
        <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle theme">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  )
}
