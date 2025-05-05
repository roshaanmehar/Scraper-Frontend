"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
  const [searchTerm, setSearchTerm] = useState("")
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
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

  // Search cities when search term changes
  useEffect(() => {
    const searchCities = async () => {
      if (searchTerm.length < 2) {
        setCities([])
        setShowDropdown(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/cities?search=${encodeURIComponent(searchTerm)}`)

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()
        setCities(data)
        setShowDropdown(true)
      } catch (err) {
        console.error("Failed to fetch cities:", err)
        setError("Failed to fetch cities. Please try again.")
        setCities([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchCities, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    setSearchTerm(city.area_covered)
    setShowDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCity) {
      setError("Please select a city from the dropdown.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Here you would integrate with your Python script
      console.log("Selected postcode area:", selectedCity.postcode_area)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      console.error("Error submitting:", err)
      setError("Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout activeTab="home">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>GMB Scraper</h1>
          <p className={styles.subtitle}>Search and scrape business data by city</p>
        </div>

        <div className={styles.searchContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputWrapper} ref={dropdownRef}>
              <div className={styles.inputContainer}>
                <Search className={styles.searchIcon} size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a city..."
                  className={styles.searchInput}
                  aria-label="Search for a city"
                />
                {loading && <div className={styles.spinner}></div>}
              </div>

              {showDropdown && cities.length > 0 && (
                <div className={styles.dropdown}>
                  {cities.map((city) => (
                    <div key={city._id} className={styles.dropdownItem} onClick={() => handleCitySelect(city)}>
                      <MapPin size={16} className={styles.locationIcon} />
                      <div className={styles.cityInfo}>
                        <span className={styles.cityName}>{city.area_covered}</span>
                        <span className={styles.postcodeArea}>{city.postcode_area}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showDropdown && cities.length === 0 && !loading && searchTerm.length >= 2 && (
                <div className={styles.dropdown}>
                  <div className={styles.noResults}>No cities found</div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`${styles.submitButton} ${submitting ? styles.submitting : ""} ${submitSuccess ? styles.success : ""}`}
              disabled={!selectedCity || submitting}
            >
              {submitting ? (
                <span className={styles.buttonSpinner}></span>
              ) : submitSuccess ? (
                "Success!"
              ) : (
                "Start Scraping"
              )}
            </button>
          </form>

          {error && <div className={styles.error}>{error}</div>}

          {selectedCity && (
            <div className={styles.selectedCity}>
              <h3>Selected City:</h3>
              <div className={styles.cityDetails}>
                <div>
                  <strong>Area:</strong> {selectedCity.area_covered}
                </div>
                <div>
                  <strong>Postcode Area:</strong> {selectedCity.postcode_area}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.featuresContainer}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔍</div>
            <h3>Search</h3>
            <p>Find cities by name and select the area you want to scrape</p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Collect</h3>
            <p>Gather business data from Google My Business listings</p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>📧</div>
            <h3>Contact</h3>
            <p>Extract email addresses and contact information</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
