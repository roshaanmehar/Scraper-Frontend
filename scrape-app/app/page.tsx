"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

// Define City type directly in this file to avoid import issues
type City = {
  _id: string
  postcode_area: string
  area_covered: string
  population_2011: number
  households_2011: number
  postcodes: number
  active_postcodes: number
  non_geographic_postcodes: number
  scraped_at: string
}

export default function ScrapePage() {
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [cityResults, setCityResults] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Search cities when input changes
  const handleCityInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCity(value)
    setError(null)

    if (value.trim().length < 2) {
      setCityResults([])
      setShowDropdown(false)
      setSelectedCity(null)
      return
    }

    setIsSearching(true)
    setShowDropdown(true)

    try {
      console.log(`Searching for city: ${value}`)
      // Use the API endpoint instead of direct server action
      const response = await fetch(`/api/cities?query=${encodeURIComponent(value)}`)

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Received ${data.cities?.length || 0} cities from API`)

      setCityResults(data.cities || [])
    } catch (error) {
      console.error("Error searching cities:", error)
      setError("Failed to search cities. Please try again.")
      setCityResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(handleCityInputChange, 300)

  // Handle city selection from dropdown
  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    setCity(city.area_covered)
    setShowDropdown(false)
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
              onChange={(e) => {
                setCity(e.target.value)
                debouncedSearch(e)
              }}
              ref={inputRef}
              autoComplete="off"
            />
            {isSearching && <div className="search-loader"></div>}

            {showDropdown && cityResults.length > 0 && (
              <div className="city-dropdown" ref={dropdownRef}>
                {cityResults.map((city) => (
                  <div key={city._id} className="city-option" onClick={() => handleCitySelect(city)}>
                    <div className="city-name">{city.area_covered}</div>
                    <div className="city-details">
                      <span className="postcode-area">{city.postcode_area}</span>
                      <span className="population">Pop: {city.population_2011.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showDropdown && cityResults.length === 0 && !isSearching && city.trim().length >= 2 && (
              <div className="city-dropdown" ref={dropdownRef}>
                <div className="no-results">No cities found</div>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          {selectedCity && (
            <div className="selected-city-info">
              <div className="info-item">
                <span className="info-label">Postcode Area:</span>
                <span className="info-value">{selectedCity.postcode_area}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Population:</span>
                <span className="info-value">{selectedCity.population_2011.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Households:</span>
                <span className="info-value">{selectedCity.households_2011.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Active Postcodes:</span>
                <span className="info-value">{selectedCity.active_postcodes.toLocaleString()}</span>
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
          />
        </div>

        <Link
          href={`/results?city=${encodeURIComponent(selectedCity?.postcode_area || city)}&keyword=${encodeURIComponent(keyword)}`}
          className={!selectedCity && city.trim() ? "disabled-link" : ""}
          onClick={(e) => {
            if (!selectedCity && city.trim()) {
              e.preventDefault()
              alert("Please select a valid city from the dropdown")
            }
          }}
        >
          <button className="btn btn-primary" disabled={!selectedCity && city.trim() !== ""}>
            Start
          </button>
        </Link>
      </div>
    </div>
  )
}
