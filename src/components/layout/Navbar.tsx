"use client"

import Link from "next/link"
import styles from "@/styles/layout/Navbar.module.css"

interface NavbarProps {
  activeTab: string
  isDarkMode: boolean
  toggleTheme: () => void
}

export default function Navbar({ activeTab, isDarkMode, toggleTheme }: NavbarProps) {
  return (
    <div className={`${styles.navbar} ${styles.animateNavbar}`}>
      <div className={`${styles.navbarBrand} ${styles.animateBrand}`}>
        <h1 className={styles.title}>GMB Scraper</h1>
      </div>

      <div className={styles.navTabs}>
        <Link href="/" className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`}>
          <span>🔍</span>
          <span>Scraper</span>
        </Link>

        <Link href="/results" className={`${styles.navTab} ${activeTab === "results" ? styles.activeNavTab : ""}`}>
          <span>📊</span>
          <span>Results</span>
        </Link>
      </div>

      <div className={styles.navActions}>
        <button
          className={`${styles.themeToggle} ${styles.animateButton}`}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  )
}
