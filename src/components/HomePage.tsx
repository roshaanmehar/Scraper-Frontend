"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/HomePage.module.css"

interface City {
  _id: string
  area_covered: string
  postcode_area: string
}

export default function HomePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [citySearch, setCitySearch] = useState("")
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [isSearchingCities, setIsSearchingCities] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)

  // Clear error message when inputs change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    setter(e.target.value)
    if (errorMessage) {
      setErrorMessage("")
    }
  }

  // Fetch cities when search input changes
  useEffect(() => {
    const fetchCities = async () => {
      if (citySearch.trim().length < 2) {
        setCities([])
        setShowCitySuggestions(false)
        return
      }

      setIsSearchingCities(true)
      try {
        const response = await fetch(`/api/cities?search=${encodeURIComponent(citySearch)}`)
        const data = await response.json()

        if (data.status === "success") {
          setCities(data.cities)
          setShowCitySuggestions(data.cities.length > 0)
        } else {
          console.error("Error fetching cities:", data.error)
          setCities([])
          setShowCitySuggestions(false)
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error)
        setCities([])
        setShowCitySuggestions(false)
      } finally {
        setIsSearchingCities(false)
      }
    }

    const debounceTimer = setTimeout(fetchCities, 300)
    return () => clearTimeout(debounceTimer)
  }, [citySearch])

  const selectCity = (city: City) => {
    setSelectedCity(city)
    setCitySearch(city.area_covered)
    setCities([])
    setShowCitySuggestions(false)
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
      <div className={`${styles.homeContainer} ${styles.fadeIn}`}>
        <div className={`${styles.mainConfigSection} ${styles.slideUp}`}>
          <h2 className={styles.sectionTitle}>Google Maps Business Scraper</h2>

          {errorMessage && (
            <div className={`${styles.errorMessage} ${styles.slideInLeft}`}>
              <Search size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formFields}>
              <div className={styles.inputGroup}>
                <label htmlFor="city" className={styles.inputLabel}>
                  <MapPin size={16} className={styles.inputIcon} />
                  City
                </label>
                <div className={styles.citySearchContainer}>
                  <input
                    id="city"
                    type="text"
                    value={citySearch}
                    onChange={(e) => handleInputChange(e, setCitySearch)}
                    placeholder="Search for city..."
                    className={styles.input}
                    autoComplete="off"
                  />
                  {isSearchingCities && <div className={styles.searchSpinner}></div>}

                  {showCitySuggestions && (
                    <div className={`${styles.citySuggestions} ${styles.fadeIn}`}>
                      {cities.map((city) => (
                        <div key={city._id} className={styles.citySuggestion} onClick={() => selectCity(city)}>
                          <MapPin size={14} />
                          <span>{city.area_covered}</span>
                          <span className={styles.postcodeArea}>{city.postcode_area}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="keyword" className={styles.inputLabel}>
                  <Search size={16} className={styles.inputIcon} />
                  Keyword
                </label>
                <input
                  id="keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => handleInputChange(e, setKeyword)}
                  placeholder="Enter business type (e.g. restaurants)"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.startButtonContainer}>
              <button
                type="submit"
                className={`${styles.startButton} ${isLoading ? styles.loadingButton : ""}`}
                disabled={isLoading}
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
