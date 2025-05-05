"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, AlertCircle, CheckCircle, Loader } from "lucide-react"
import styles from "@/styles/ScraperForm.module.css"

export default function ScraperForm() {
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("restaurants")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inProgress, setInProgress] = useState(false)

  // Check if there's an active job for this city
  useEffect(() => {
    if (city && inProgress) {
      const checkJobStatus = async () => {
        try {
          const response = await fetch(`/api/scrape?city=${encodeURIComponent(city.toLowerCase())}`)
          const data = await response.json()

          if (response.ok) {
            setInProgress(data.inProgress)

            if (!data.inProgress) {
              setSuccess(`Scraping completed for ${city}`)
              setIsLoading(false)
            }
          }
        } catch (error) {
          console.error("Error checking job status:", error)
        }
      }

      // Poll every 10 seconds
      const interval = setInterval(checkJobStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [city, inProgress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city.trim()) {
      setError("Please enter a city name")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: city.trim(),
          keyword: keyword.trim() || "restaurants",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start scraping job")
      }

      setSuccess(`Scraping job started for ${city}`)
      setInProgress(data.inProgress)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Start Scraping Job</h2>
        <p className={styles.formDescription}>Enter a city name to start the automated scraping process</p>
      </div>
      <div className={styles.formContent}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="city" className={styles.formLabel}>
              City Name
            </label>
            <input
              id="city"
              className={styles.formInput}
              placeholder="e.g. Leeds, Manchester, London"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="keyword" className={styles.formLabel}>
              Keyword (optional)
            </label>
            <input
              id="keyword"
              className={styles.formInput}
              placeholder="e.g. restaurants, hotels (default: restaurants)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={18} />
              <div>
                <h4 className={styles.errorTitle}>Error</h4>
                <p className={styles.errorMessage}>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className={styles.successAlert}>
              <CheckCircle size={18} />
              <div>
                <h4 className={styles.successTitle}>Success</h4>
                <p className={styles.successMessage}>{success}</p>
              </div>
            </div>
          )}

          <div className={styles.formFooter}>
            <button type="submit" className={styles.submitButton} disabled={isLoading || !city.trim()}>
              {isLoading ? (
                <>
                  <Loader size={18} className={styles.spinningIcon} />
                  {inProgress ? "Scraping in progress..." : "Starting job..."}
                </>
              ) : (
                <>
                  <Search size={18} />
                  Start Scraping
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
