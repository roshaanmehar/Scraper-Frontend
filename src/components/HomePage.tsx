"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, MapPin } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
        return
      }

      setIsSearchingCities(true)
      try {
        const response = await fetch(`/api/cities?search=${encodeURIComponent(citySearch)}`)
        const data = await response.json()

        if (data.status === "success") {
          setCities(data.cities)
        } else {
          console.error("Error fetching cities:", data.error)
          setCities([])
        }
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

  const selectCity = (city: City) => {
    setSelectedCity(city)
    setCitySearch(city.area_covered)
    setCities([])
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
      <motion.div
        className={styles.homeContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className={styles.mainConfigSection}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className={styles.sectionTitle}>Google Maps Business Scraper</h2>

          {errorMessage && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Search size={16} />
              <span>{errorMessage}</span>
            </motion.div>
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

                  <AnimatePresence>
                    {cities.length > 0 && (
                      <motion.div
                        className={styles.citySuggestions}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {cities.map((city) => (
                          <motion.div
                            key={city._id}
                            className={styles.citySuggestion}
                            onClick={() => selectCity(city)}
                            whileHover={{ backgroundColor: "#f0f0f0" }}
                          >
                            <MapPin size={14} />
                            <span>{city.area_covered}</span>
                            <span className={styles.postcodeArea}>{city.postcode_area}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <motion.button
                type="submit"
                className={`${styles.startButton} ${isLoading ? styles.loadingButton : ""}`}
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
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
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AppLayout>
  )
}
