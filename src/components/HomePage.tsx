"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import styles from "../styles/HomePage.module.css"

interface City {
  _id: string
  area_covered: string
  postcode_area: string
}

export default function HomePage() {
  const router = useRouter()
  const [citySearch, setCitySearch] = useState("")
  const [keyword, setKeyword] = useState("")
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [isSearchingCities, setIsSearchingCities] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Create a debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Create a memoized debounced fetch function
  const debouncedFetchCities = useCallback(
    debounce(async (searchTerm: string) => {
      if (searchTerm.trim().length < 1) {
        setCities([])
        setShowDropdown(false)
        setIsSearchingCities(false)
        return
      }

      try {
        console.log(`Fetching cities for search term: "${searchTerm}"`)
        const response = await fetch(`/api/cities?search=${encodeURIComponent(searchTerm)}`)
        const data = await response.json()

        if (Array.isArray(data)) {
          setCities(data)
          setShowDropdown(data.length > 0)

          // If we have an exact match, select it automatically
          const exactMatch = data.find((city) => city.area_covered.toLowerCase() === searchTerm.toLowerCase())

          if (exactMatch && data.length === 1) {
            selectCity(exactMatch)
          }
        } else {
          console.error("Invalid data format received from API:", data)
          setCities([])
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error)
        setCities([])
      } finally {
        setIsSearchingCities(false)
      }
    }, 150),
    [],
  )

  // Fetch cities when search input changes
  useEffect(() => {
    if (citySearch.trim().length < 1) {
      setCities([])
      setShowDropdown(false)
      return
    }

    setIsSearchingCities(true)
    debouncedFetchCities(citySearch)
  }, [citySearch, debouncedFetchCities])

  const selectCity = (city: City) => {
    setSelectedCity(city)
    setCitySearch(city.area_covered)
    setShowDropdown(false)

    // Move focus to keyword input after selection
    document.getElementById("keyword")?.focus()
  }

  const clearCitySelection = () => {
    setSelectedCity(null)
    setCitySearch("")
    cityInputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    setter(e.target.value)
    if (errorMessage) {
      setErrorMessage("")
    }

    // If changing city input and there's a selected city, clear it
    if (e.target.id === "city" && selectedCity) {
      setSelectedCity(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCity || !keyword) {
      setErrorMessage(
        !selectedCity && !keyword
          ? "Please select a city and enter a keyword"
          : !selectedCity
            ? "Please select a city from the dropdown"
            : "Please enter a keyword",
      )
      return
    }

    setIsLoading(true)

    // Here we would pass the postcode_area to the Python script
    console.log(`Selected postcode area: ${selectedCity.postcode_area} for keyword: ${keyword}`)

    // Simulate API call/processing
    setTimeout(() => {
      // Navigate to results page
      router.push("/results")
    }, 1000)
  }

  return (
    <div className={styles.homeContainer}>
      <div className={styles.mainConfigSection}>
        <h2 className={styles.sectionTitle}>GMB Scraper</h2>

        {errorMessage && (
          <div className={styles.errorMessage}>
            <span className={styles.searchIcon}>🔍</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <div className={styles.inputGroup} ref={dropdownRef}>
              <label htmlFor="city">City</label>
              <div className={styles.citySearchContainer}>
                <input
                  id="city"
                  ref={cityInputRef}
                  type="text"
                  value={citySearch}
                  onChange={(e) => handleInputChange(e, setCitySearch)}
                  onFocus={() => citySearch.trim().length > 0 && setShowDropdown(true)}
                  placeholder="Enter city name"
                  className={`${styles.input} ${selectedCity ? styles.selectedInput : ""}`}
                  autoComplete="off"
                />
                {isSearchingCities && <div className={styles.searchSpinner}></div>}
                {selectedCity && (
                  <div className={styles.selectedIndicator}>
                    <span className={styles.checkIcon}>✓</span>
                  </div>
                )}
                {selectedCity && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={clearCitySelection}
                    aria-label="Clear city selection"
                  >
                    ✕
                  </button>
                )}

                {showDropdown && cities.length > 0 && (
                  <div className={styles.citySuggestions}>
                    {cities.map((city) => (
                      <div key={city._id} className={styles.citySuggestion} onClick={() => selectCity(city)}>
                        <span className={styles.suggestionIcon}>📍</span>
                        <span className={styles.cityName}>{highlightMatch(city.area_covered, citySearch)}</span>
                        <span className={styles.postcodeArea}>{city.postcode_area}</span>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && cities.length === 0 && !isSearchingCities && (
                  <div className={styles.noResults}>
                    No cities found matching "{citySearch}"
                    <button
                      type="button"
                      className={styles.manualEntryButton}
                      onClick={() => {
                        setSelectedCity({
                          _id: "manual",
                          area_covered: citySearch,
                          postcode_area: "UNKNOWN",
                        })
                        setShowDropdown(false)
                      }}
                    >
                      Use "{citySearch}" anyway
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="keyword">Keyword</label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => handleInputChange(e, setKeyword)}
                placeholder="Enter keyword (e.g. restaurants)"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.startButtonContainer}>
            <button
              type="submit"
              className={`${styles.startButton} ${isLoading ? styles.loadingButton : ""}`}
              disabled={isLoading || !selectedCity || !keyword}
            >
              {isLoading ? (
                <>
                  <span className={styles.loadingSpinner}></span> Processing...
                </>
              ) : (
                <>🔍 Start Scraper</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Helper function to highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) => (regex.test(part) ? <strong key={index}>{part}</strong> : part))
  } catch (e) {
    // Fallback in case of regex error
    return text
  }
}
