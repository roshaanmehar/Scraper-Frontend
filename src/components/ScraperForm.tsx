"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "../styles/ScraperForm.module.css"

interface ScraperFormProps {
  initialKeyword?: string
  initialCity?: string
}

export default function ScraperForm({ initialKeyword = "", initialCity = "" }: ScraperFormProps) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(initialKeyword)
  const [city, setCity] = useState(initialCity)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!keyword || !city) {
      setError("Please fill in all fields")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/results")
    } catch (err) {
      setError("An error occurred while processing your request")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.formGroup}>
        <label htmlFor="city">City</label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
          className={styles.input}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="keyword">Keyword</label>
        <input
          id="keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Enter keyword (e.g. restaurants)"
          className={styles.input}
          required
        />
      </div>

      <button type="submit" className={styles.submitButton} disabled={isLoading}>
        {isLoading ? "Processing..." : "Start Scraper"}
      </button>
    </form>
  )
}
