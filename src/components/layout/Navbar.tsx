"use client"

import Link from "next/link"
import { Database, Search, Sun, Moon } from "lucide-react"
import { motion } from "framer-motion"
import styles from "@/styles/layout/Navbar.module.css"

interface NavbarProps {
  activeTab: string
  isDarkMode: boolean
  toggleTheme: () => void
}

export default function Navbar({ activeTab, isDarkMode, toggleTheme }: NavbarProps) {
  return (
    <motion.div
      className={styles.navbar}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className={styles.navbarBrand}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <h1 className={styles.title}>GMB Scraper</h1>
      </motion.div>

      <div className={styles.navTabs}>
        <Link href="/" className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`}>
          <Search size={18} />
          <span>Scraper</span>
        </Link>

        <Link href="/results" className={`${styles.navTab} ${activeTab === "results" ? styles.activeNavTab : ""}`}>
          <Database size={18} />
          <span>Results</span>
        </Link>
      </div>

      <div className={styles.navActions}>
        <motion.button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </motion.button>
      </div>
    </motion.div>
  )
}
