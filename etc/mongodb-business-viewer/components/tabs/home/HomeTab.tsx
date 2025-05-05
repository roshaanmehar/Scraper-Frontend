"use client"

import { useEffect } from "react"
import { useState } from "react"
import { Play, Pause, Globe, Database, Shield, AlertCircle } from "lucide-react"
import { useRipple } from "@/hooks/useRipple"
import { useLogStore } from "@/stores/logStore"
import styles from "@/styles/tabs/HomeTab.module.css"

interface HomeTabProps {
  isRunning: boolean
  setIsRunning: (isRunning: boolean) => void
  progress: number
  setProgress: (progress: number) => void
  totalSectors: number
  setTotalSectors: (totalSectors: number) => void
  currentSector: string
  setCurrentSector: (currentSector: string) => void
  totalCards: number
  setTotalCards: (totalCards: number) => void
  newUpserts: number
  setNewUpserts: (newUpserts: number) => void
}

export default function HomeTab({
  isRunning,
  setIsRunning,
  progress,
  setProgress,
  totalSectors,
  setTotalSectors,
  currentSector,
  setCurrentSector,
  totalCards,
  setTotalCards,
  newUpserts,
  setNewUpserts,
}: HomeTabProps) {
  const { createRipple } = useRipple()
  const { addLog } = useLogStore()

  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [headless, setHeadless] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  // Clear error message when inputs change
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage("")
    }
  }, [city, keyword, errorMessage])

  const toggleScraper = () => {
    if (!city || !keyword) {
      setErrorMessage(
        !city && !keyword
          ? "Please enter both city and keyword"
          : !city
            ? "Please enter a city"
            : "Please enter a keyword",
      )
      return
    }

    setIsRunning(!isRunning)

    if (!isRunning) {
      // Simulate starting the scraper
      addLog(`Starting scraper for ${keyword} in ${city}`)
      addLog(`Headless mode: ${headless ? "enabled" : "disabled"}`)
      addLog("Initializing browser...")
      addLog("Setting up proxy rotation...")
      addLog("Browser launched successfully")

      // Simulate scraping process
      setTotalSectors(10)
      simulateScraping()
    } else {
      // Simulate stopping the scraper
      addLog("Scraper stopped by user")
      addLog("Closing browser sessions...")
      addLog("Saving current progress...")
      setTimeout(() => {
        addLog("Scraper shutdown complete")
      }, 1000)
    }
  }

  const simulateScraping = () => {
    const sectors = [
      "RESTAURANTS",
      "CAFES",
      "BARS",
      "HOTELS",
      "RETAIL SHOPS",
      "SUPERMARKETS",
      "GYMS",
      "SALONS",
      "DENTISTS",
      "MECHANICS",
    ]
    let sectorIndex = 0
    let cards = 0
    let upserts = 0

    const interval = setInterval(() => {
      if (sectorIndex >= sectors.length || !isRunning) {
        clearInterval(interval)
        if (isRunning) {
          addLog("Scraping completed successfully")
          addLog(`Total businesses found: ${cards}`)
          addLog(`New records added: ${upserts}`)
          addLog("Data saved to database")
          setIsRunning(false)
        }
        return
      }

      const currentSectorName = sectors[sectorIndex]
      setCurrentSector(currentSectorName)
      setProgress(Math.round(((sectorIndex + 1) / sectors.length) * 100))

      const sectorCards = Math.floor(Math.random() * 30) + 5
      cards += sectorCards
      const sectorUpserts = Math.floor(sectorCards * 0.7)
      upserts += sectorUpserts

      setTotalCards(cards)
      setNewUpserts(upserts)

      addLog(`▶ (${sectorIndex + 1}/${sectors.length}) ${currentSectorName}`)

      // Simulate some random events
      if (Math.random() > 0.7) {
        addLog(`Found ${sectorCards} businesses in ${currentSectorName}`)
      }

      if (Math.random() > 0.8) {
        addLog(`WARNING: Possible rate limiting detected, slowing down...`)
      }

      addLog(
        `✓ ${currentSectorName} - ${(Math.random() * 20 + 10).toFixed(1)}s cards=${sectorCards} new=${sectorUpserts}`,
      )

      sectorIndex++
    }, 3000)
  }

  return (
    <div className={styles.homeTab}>
      <div className={styles.mainConfigSection}>
        <h2 className={styles.sectionTitle}>Scraper Configuration</h2>

        {errorMessage && (
          <div className={styles.errorMessage}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className={styles.requiredFields}>
          <div className={styles.inputGroup}>
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city (e.g. London)"
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="keyword">Keyword</label>
            <input
              id="keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword (e.g. restaurants)"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.toggleSection}>
          <div className={styles.toggleGroup}>
            <label htmlFor="headless">Headless Mode</label>
            <label className={styles.switch}>
              <input id="headless" type="checkbox" checked={headless} onChange={() => setHeadless(!headless)} />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        <div className={styles.startButtonContainer}>
          <button
            className={`${styles.startButton} ${isRunning ? styles.stopButton : ""}`}
            onClick={(e) => {
              toggleScraper()
              createRipple(e)
            }}
          >
            {isRunning ? (
              <>
                <Pause size={20} /> Stop Scraper
              </>
            ) : (
              <>
                <Play size={20} /> Start Scraper
              </>
            )}
          </button>
        </div>

        {/* Current Progress Section */}
        {(isRunning || progress > 0) && (
          <div className={styles.progressSection}>
            <h3>Current Progress</h3>
            <div className={styles.progressInfo}>
              <span>Current sector: {currentSector || "None"}</span>
              <span>{progress}% Complete</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
            </div>

            <div className={styles.statsCards}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Globe size={24} />
                </div>
                <div className={styles.statInfo}>
                  <h3>Sectors</h3>
                  <p>{totalSectors}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Database size={24} />
                </div>
                <div className={styles.statInfo}>
                  <h3>Records</h3>
                  <p>{totalCards}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Shield size={24} />
                </div>
                <div className={styles.statInfo}>
                  <h3>New</h3>
                  <p>{newUpserts}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
