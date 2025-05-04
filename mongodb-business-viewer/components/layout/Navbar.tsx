"use client"

import type React from "react"

import Link from "next/link"
import { Home, Database, Terminal, Sun, Moon } from "lucide-react"
import styles from "@/styles/layout/Navbar.module.css"

interface NavbarProps {
  activeTab: string
  isDarkMode: boolean
  toggleTheme: () => void
}

export default function Navbar({ activeTab, isDarkMode, toggleTheme }: NavbarProps) {
  // Create ripple effect on buttons
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    try {
      const element = event.currentTarget
      if (!element) return

      const circle = document.createElement("span")
      const diameter = Math.max(element.clientWidth || 0, element.clientHeight || 0)
      const radius = diameter / 2

      // Get element position
      const rect = element.getBoundingClientRect()

      circle.style.width = circle.style.height = `${diameter}px`
      circle.style.left = `${event.clientX - rect.left - radius}px`
      circle.style.top = `${event.clientY - rect.top - radius}px`
      circle.classList.add("ripple")

      // Remove existing ripples
      const ripple = element.getElementsByClassName("ripple")[0]
      if (ripple) {
        ripple.remove()
      }

      element.appendChild(circle)

      // Remove ripple after animation
      setTimeout(() => {
        if (circle && circle.parentElement) {
          circle.remove()
        }
      }, 600)
    } catch (error) {
      console.error("Ripple effect error:", error)
    }
  }

  return (
    <div className={`${styles.navbar} ${!isDarkMode ? styles.lightTheme : ""}`}>
      <div className={styles.navbarBrand}>
        <Terminal className={styles.titleIcon} />
        <h1 className={styles.title}>GMB Scraper</h1>
      </div>

      <div className={styles.navTabs}>
        <Link href="/" passHref legacyBehavior>
          <a className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`} onClick={createRipple}>
            <Home size={18} />
            <span>Home</span>
          </a>
        </Link>

        <Link href="/results" passHref legacyBehavior>
          <a
            className={`${styles.navTab} ${activeTab === "results" ? styles.activeNavTab : ""}`}
            onClick={createRipple}
          >
            <Database size={18} />
            <span>Results</span>
          </a>
        </Link>
      </div>

      <div className={styles.navActions}>
        <button
          className={styles.themeToggle}
          onClick={(e) => {
            toggleTheme()
            createRipple(e)
          }}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  )
}
