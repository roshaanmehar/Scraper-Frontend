"use client"

import { useState, useEffect } from "react"

export const useTheme = () => {
  // Check if localStorage is available (client-side)
  const isClient = typeof window !== "undefined"

  // Get initial theme from localStorage or default to dark
  const getInitialTheme = () => {
    if (isClient) {
      const savedTheme = localStorage.getItem("theme")
      if (savedTheme) {
        return savedTheme === "dark"
      }
      // If no saved preference, check system preference
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return true // Default to dark theme on server
  }

  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme)

  // Update localStorage when theme changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light")
    }
  }, [isDarkMode, isClient])

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev)
  }

  return { isDarkMode, toggleTheme }
}
