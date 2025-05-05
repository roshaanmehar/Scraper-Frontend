"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { Restaurant } from "./actions"

type PaginationProps = {
  total: number
  pages: number
  currentPage: number
  limit: number
}

type SearchResultsProps = {
  initialRestaurants: Restaurant[]
  initialPagination: PaginationProps
  initialQuery: string
}

export default function SearchComponent({ initialRestaurants, initialPagination, initialQuery }: SearchResultsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [restaurants, setRestaurants] = useState(initialRestaurants)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [sortOption, setSortOption] = useState("recent")

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

  // Function to fetch search results
  const fetchSearchResults = useCallback(
    async (searchQuery: string, page = 1) => {
      if (!searchQuery.trim()) {
        // If search is empty, redirect to main results page
        router.push("/results")
        return
      }

      setIsLoading(true)
      try {
        // Update URL without full page reload
        const params = new URLSearchParams()
        params.set("query", searchQuery)
        if (page > 1) params.set("page", page.toString())

        // Update the URL to reflect the search
        router.push(`/results/search?${params.toString()}`, { scroll: false })

        // Fetch results from API
        const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&page=${page}`)
        const data = await response.json()

        setRestaurants(data.restaurants)
        setPagination(data.pagination)
      } catch (error) {
        console.error("Error fetching search results:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [router],
  )

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      fetchSearchResults(value)
    }, 300),
    [fetchSearchResults],
  )

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSortOption(value)

    // Sort the current results
    const sortedRestaurants = [...restaurants]

    switch (value) {
      case "name":
        sortedRestaurants.sort((a, b) => a.businessname.localeCompare(b.businessname))
        break
      case "reviews":
        sortedRestaurants.sort((a, b) => (b.numberofreviews || 0) - (a.numberofreviews || 0))
        break
      case "recent":
      default:
        // Already sorted by recent in the API
        break
    }

    setRestaurants(sortedRestaurants)
  }

  // Generate pagination numbers
  const paginationNumbers = []
  const maxVisiblePages = 5

  if (pagination.pages <= maxVisiblePages) {
    for (let i = 1; i <= pagination.pages; i++) {
      paginationNumbers.push(i)
    }
  } else {
    paginationNumbers.push(1)

    let startPage = Math.max(2, pagination.currentPage - 1)
    let endPage = Math.min(pagination.pages - 1, pagination.currentPage + 1)

    if (pagination.currentPage <= 3) {
      endPage = 4
    }

    if (pagination.currentPage >= pagination.pages - 2) {
      startPage = pagination.pages - 3
    }

    if (startPage > 2) {
      paginationNumbers.push("...")
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationNumbers.push(i)
    }

    if (endPage < pagination.pages - 1) {
      paginationNumbers.push("...")
    }

    paginationNumbers.push(pagination.pages)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchSearchResults(query, page)
  }

  return (
    <>
      <div className="card">
        <div className="search-controls">
          <div className="search-wrapper">
            <input
              type="text"
              name="query"
              placeholder="Search by name, email, or phone..."
              className="search-input"
              value={query}
              onChange={handleSearchChange}
            />
            {isLoading && <div className="search-loader"></div>}
          </div>

          <div className="action-controls">
            <div className="sort-wrapper">
              <label htmlFor="sort">Sort by:</label>
              <select id="sort" className="sort-select" value={sortOption} onChange={handleSortChange}>
                <option value="recent">Most Recent</option>
                <option value="name">Business Name</option>
                <option value="reviews">Number of Reviews</option>
              </select>
            </div>

            <button className="btn btn-secondary">Export</button>
          </div>
        </div>
      </div>

      <div className="results-summary">
        {query ? (
          <span>
            Found {pagination.total} restaurants matching "{query}" with valid emails
          </span>
        ) : (
          <span>Found {pagination.total} restaurants with valid emails</span>
        )}
      </div>

      <div className="results-grid">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <div className="result-card" key={restaurant._id}>
              <h3 className="business-name">{restaurant.businessname}</h3>
              <div className="business-details">
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <div className="email-list">
                    {Array.isArray(restaurant.email) ? (
                      restaurant.email
                        .filter((email) => email && email !== "N/A" && email !== "n/a" && email.trim() !== "")
                        .map((email, index) => (
                          <span key={index} className="detail-value">
                            {email}
                          </span>
                        ))
                    ) : (
                      <span className="detail-value">{restaurant.email}</span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">
                    {restaurant.phonenumber ? restaurant.phonenumber : "No phone available"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Website:</span>
                  {restaurant.website ? (
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="website-link">
                      Visit Website
                    </a>
                  ) : (
                    <span className="detail-value no-data">No website available</span>
                  )}
                </div>
                {restaurant.numberofreviews && (
                  <div className="detail-item">
                    <span className="detail-label">Reviews:</span>
                    <span className="detail-value">{restaurant.numberofreviews} reviews</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            {isLoading ? "Searching..." : `No restaurants found matching "${query}" with valid emails`}
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={pagination.currentPage === 1 || isLoading}
            onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {paginationNumbers.map((num, index) =>
              typeof num === "number" ? (
                <button
                  key={index}
                  className={`pagination-number ${pagination.currentPage === num ? "active" : ""}`}
                  onClick={() => handlePageChange(num)}
                  disabled={isLoading}
                >
                  {num}
                </button>
              ) : (
                <span key={index} className="pagination-ellipsis">
                  {num}
                </span>
              ),
            )}
          </div>
          <button
            className="pagination-btn"
            disabled={pagination.currentPage === pagination.pages || isLoading}
            onClick={() => handlePageChange(Math.min(pagination.pages, pagination.currentPage + 1))}
          >
            Next
          </button>
        </div>
      )}

      <div className="navigation">
        <Link href="/">
          <button className="btn btn-outline">Back to Search</button>
        </Link>
      </div>
    </>
  )
}
