"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin, X } from "lucide-react"
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
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

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
        const response = await fetch(`/api/cities?search=${encodeURIComponent(citySearch)}`)
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Cities data:", data)

        setCities(Array.isArray(data) ? data : [])
        setShowDropdown(true)
        setFocusedIndex(-1) // Reset focused index when new results arrive
      } catch (error) {
        console.error("Failed to fetch cities:", error)
        setCities([])
      } finally {
        setIsSearchingCities(false)
      }
    }

    const debounceTimer = setTimeout(fetchCities, 300)
    return () => clearTimeout(debounceTimer)
  }, [citySearch])

  // Scroll to focused item
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < suggestionRefs.current.length) {
      suggestionRefs.current[focusedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [focusedIndex])

  const selectCity = (city: City) => {
    setSelectedCity(city)
    setCitySearch(city.area_covered)
    setShowDropdown(false)
    setFocusedIndex(-1)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    // Handle arrow keys for navigation
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev < cities.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault()
      selectCity(cities[focusedIndex])
    } else if (e.key === "Escape") {
      setShowDropdown(false)
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
                    onKeyDown={handleKeyDown}
                    onFocus={() => citySearch.trim().length > 0 && setShowDropdown(true)}
                    placeholder="Enter city name"
                    className={`${styles.input} ${selectedCity ? styles.selectedInput : ""}`}
                    autoComplete="off"
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    aria-controls="city-suggestions"
                    aria-activedescendant={focusedIndex >= 0 ? `city-suggestion-${focusedIndex}` : undefined}
                  />
                  {isSearchingCities && <div className={styles.searchSpinner}></div>}
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
                    <div id="city-suggestions" className={styles.citySuggestions} role="listbox">
                      {cities.map((city, index) => (
                        <div
                          ref={(el) => (suggestionRefs.current[index] = el)}
                          key={city._id}
                          id={`city-suggestion-${index}`}
                          className={`${styles.citySuggestion} ${focusedIndex === index ? styles.focused : ""}`}
                          onClick={() => selectCity(city)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          role="option"
                          aria-selected={focusedIndex === index}
                        >
                          <MapPin size={16} className={styles.suggestionIcon} />
                          <span className={styles.cityName}>{highlightMatch(city.area_covered, citySearch)}</span>
                          <span className={styles.postcodeArea}>{city.postcode_area}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showDropdown && cities.length === 0 && !isSearchingCities && (
                    <div className={styles.noResults}>No cities found matching "{citySearch}"</div>
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
