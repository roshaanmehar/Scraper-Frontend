"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin, X, Check } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/HomePage.module.css"

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

  // Fetch cities when search input changes
  useEffect(() => {
    const fetchCities = async () => {
      if (citySearch.trim().length < 1) {
        setCities([])
        setShowDropdown(false)
        return
      }

      setIsSearchingCities(true)
      try {
        console.log(`Fetching cities for search term: "${citySearch}"`)
        const response = await fetch(`/api/cities?search=${encodeURIComponent(citySearch)}`)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`Received ${Array.isArray(data) ? data.length : 0} cities from API`)

        if (Array.isArray(data)) {
          setCities(data)
          setShowDropdown(data.length > 0)

          // If we have an exact match, select it automatically
          const exactMatch = data.find((city) => city.area_covered.toLowerCase() === citySearch.toLowerCase())

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
    }

    // Reduced debounce time for faster feedback
    const debounceTimer = setTimeout(fetchCities, 150)
    return () => clearTimeout(debounceTimer)
  }, [citySearch])

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
    <AppLayout activeTab="home">
      <div className={styles.homeContainer}>
        <div className={styles.mainConfigSection}>
          <h2 className={styles.sectionTitle}>GMB Scraper</h2>

          {errorMessage && (
            <div className={styles.errorMessage}>
              <Search size={16} />
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
                      <Check size={16} className={styles.checkIcon} />
                    </div>
                  )}
                  {selectedCity && (
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={clearCitySelection}
                      aria-label="Clear city selection"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {showDropdown && cities.length > 0 && (
                    <div className={styles.citySuggestions}>
                      {cities.map((city) => (
                        <div key={city._id} className={styles.citySuggestion} onClick={() => selectCity(city)}>
                          <MapPin size={16} className={styles.suggestionIcon} />
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
                  <>
                    <Search size={20} /> Start Scraper
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
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
