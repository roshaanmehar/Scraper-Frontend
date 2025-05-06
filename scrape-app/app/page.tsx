"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { City, ScrapeStatus } from "./types"

export default function ScrapePage() {
  const router = useRouter()
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cityResults, setCityResults] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null)
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling)
      }
    }
  }, [statusPolling])

  // Start searching immediately when component mounts
  useEffect(() => {
    if (city.trim().length >= 2) {
      handleCitySearch(city)
    }
  }, [])

  // Search cities function
  const handleCitySearch = async (value: string) => {
    if (value.trim().length < 2) {
      setCityResults([])
      setShowDropdown(false)
      setSelectedCity(null)
      return
    }

    setIsSearching(true)
    setShowDropdown(true)

    try {
      // Use the API endpoint
      const response = await fetch(`/api/cities?query=${encodeURIComponent(value)}`)

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`)
      }

      const data = await response.json()
      setCityResults(data.cities || [])
    } catch (error) {
      console.error("Error searching cities:", error)
      setCityResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce function to prevent too many requests while typing
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(handleCitySearch, 300)

  // Handle input change
  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCity(value)
    debouncedSearch(value)
  }

  // Handle city selection from dropdown
  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    setCity(city.area_covered)
    setShowDropdown(false)
  }

  // Poll for scraper status
  const startStatusPolling = () => {
    // First get status immediately
    fetchScraperStatus()

    // Then set up polling
    const intervalId = setInterval(fetchScraperStatus, 5000)
    setStatusPolling(intervalId)
  }

  // Stop status polling
  const stopStatusPolling = () => {
    if (statusPolling) {
      clearInterval(statusPolling)
      setStatusPolling(null)
    }
  }

  // Fetch current scraper status
  const fetchScraperStatus = async () => {
    try {
      const response = await fetch("/api/scraper/status")
      if (!response.ok) throw new Error("Failed to fetch status")

      const status = await response.json()
      setScrapeStatus(status)

      // Update UI status message based on scraper status
      if (status.status === "completed") {
        setStatusMessage(`Scrape process completed: ${status.message}`)
        setIsScraping(false)
        stopStatusPolling()
      } else if (status.status === "error") {
        setStatusMessage(`Scrape error: ${status.message}`)
        setIsScraping(false)
        stopStatusPolling()
      } else if (status.status === "running") {
        setStatusMessage(`Scrape in progress: ${status.message}`)
        setIsScraping(true)
      }
    } catch (error) {
      console.error("Error fetching scraper status:", error)
    }
  }

  // Update the handleStartClick function to always start the scraping process
  const handleStartClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (!selectedCity) {
      alert("Please select a valid city from the dropdown")
      return
    }

    setIsProcessing(true)
    setStatusMessage("Checking database status...")

    try {
      // Check if database exists - we still check to inform the user, but will run scrapers regardless
      const response = await fetch(
        `/api/check-database?city=${encodeURIComponent(selectedCity.area_covered)}&postcode_area=${encodeURIComponent(selectedCity.postcode_area)}`,
      )

      if (!response.ok) {
        throw new Error(`Database check failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Database check response:", data)

      // Update message based on whether database exists
      if (data.exists === true) {
        setStatusMessage("Database exists. Will run Google Maps scraper directly (skipping postcodes scraper)...")
      } else {
        setStatusMessage("Database doesn't exist. Will run postcodes scraper first...")
      }

      // Always initiate scrape, regardless of whether database exists
      setIsScraping(true)

      try {
        // Start the scraping process with our own API
        const scrapeResponse = await fetch(`/api/check-database`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cityName: selectedCity.area_covered,
            postcodeArea: selectedCity.postcode_area,
            keyword: keyword || "restaurant",
          }),
        })

        if (!scrapeResponse.ok) {
          throw new Error(`Scrape initiation failed with status: ${scrapeResponse.status}`)
        }

        const scrapeData = await scrapeResponse.json()
        setStatusMessage(`Scrape initiated successfully: ${scrapeData.message || "Processing"}`)

        // Start polling for status updates
        startStatusPolling()

        // Keep processing state true while scraping
        setIsProcessing(true)
      } catch (error) {
        console.error("Error initiating scrape:", error)
        setStatusMessage(`Error initiating scrape: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsScraping(false)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error in start process:", error)

      // Even if we can't check database, try to start scraping anyway
      setStatusMessage("Error checking database. Attempting to start scrape anyway...")
      setIsScraping(true)

      try {
        // Start the scraping process with our own API
        const scrapeResponse = await fetch(`/api/check-database`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cityName: selectedCity.area_covered,
            postcodeArea: selectedCity.postcode_area,
            keyword: keyword || "restaurant",
          }),
        })

        if (!scrapeResponse.ok) {
          throw new Error(`Scrape initiation failed with status: ${scrapeResponse.status}`)
        }

        const scrapeData = await scrapeResponse.json()
        setStatusMessage(`Scrape initiated successfully: ${scrapeData.message || "Processing"}`)

        // Start polling for status updates
        startStatusPolling()

        // Keep processing state true while scraping
        setIsProcessing(true)
      } catch (scrapeError) {
        console.error("Error initiating scrape:", scrapeError)
        setStatusMessage(
          `Error initiating scrape: ${scrapeError instanceof Error ? scrapeError.message : "Unknown error"}`,
        )
        setIsScraping(false)
        setIsProcessing(false)
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="container">
      <h1>Restaurant Scraper</h1>
      <div className="card">
        <div className="form-group">
          <label htmlFor="city">City</label>
          <div className="city-search-container">
            <input
              type="text"
              id="city"
              name="city"
              placeholder="Enter city name"
              value={city}
              onChange={handleCityInputChange}
              ref={inputRef}
              autoComplete="off"
              disabled={isProcessing}
            />
            {isSearching && <div className="search-loader"></div>}

            {showDropdown && cityResults.length > 0 && (
              <div className="city-dropdown" ref={dropdownRef}>
                {cityResults.map((city) => (
                  <div key={city._id} className="city-option" onClick={() => handleCitySelect(city)}>
                    <div className="city-name">{city.area_covered}</div>
                    <div className="postcode-area">{city.postcode_area}</div>
                  </div>
                ))}
              </div>
            )}

            {showDropdown && cityResults.length === 0 && !isSearching && city.trim().length >= 2 && (
              <div className="city-dropdown" ref={dropdownRef}>
                <div className="no-results">No cities found</div>
              </div>
            )}
          </div>

          {selectedCity && (
            <div className="selected-city-info">
              <div className="info-item">
                <span className="info-label">Postcode Area:</span>
                <span className="info-value">{selectedCity.postcode_area}</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="keyword">Keyword</label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            placeholder="Enter keyword to search (e.g. restaurant, cafe)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="button-container">
          <button className="btn btn-primary" disabled={!selectedCity || isProcessing} onClick={handleStartClick}>
            {isProcessing ? "Processing..." : "Start"}
          </button>

          {/* Only show this button when a scrape has been initiated or completed */}
          {(isScraping || (scrapeStatus && scrapeStatus.status === "completed")) && (
            <button
              className="btn btn-outline"
              onClick={() =>
                router.push(
                  `/results?city=${encodeURIComponent(selectedCity?.postcode_area || "")}&keyword=${encodeURIComponent(keyword)}`,
                )
              }
            >
              Go to Results
            </button>
          )}
        </div>

        {statusMessage && (
          <div className={`status-message ${statusMessage.includes("Error") ? "status-error" : ""}`}>
            {statusMessage}
            {isScraping && <div className="status-loader"></div>}
          </div>
        )}

        {/* Scrape logs display (only show when scraping) */}
        {isScraping && scrapeStatus && scrapeStatus.recentLogs && scrapeStatus.recentLogs.length > 0 && (
          <div className="scrape-logs">
            <h3>Scraper Activity</h3>
            <div className="logs-container">
              {scrapeStatus.recentLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
