"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Navbar from "@/components/layout/Navbar"
import styles from "@/styles/ScraperControlPanel.module.css"

interface AppLayoutProps {
  children: React.ReactNode
  activeTab: string
}

export default function AppLayout({ children, activeTab }: AppLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Check if localStorage is available (client-side)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark")
    } else {
      // If no saved preference, check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setIsDarkMode(prefersDark)
    }
  }, [])

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light")
  }, [isDarkMode])

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev)
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.gradientBackground}></div>
      <div className={styles.panel}>
        <Navbar activeTab={activeTab} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className={styles.contentArea}>{children}</div>
      </div>
    </div>
  )
}
