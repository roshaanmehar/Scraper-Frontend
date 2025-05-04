"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Download, Search, MapPin, Phone, Globe, Mail, Loader } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/ResultsPage.module.css"

interface Business {
  _id: string
  businessname: string
  address: string
  phonenumber: string
  website: string
  email: string[] | string
  stars: string
  subsector: string
  scraped_at: string
  numberofreviews?: number
}

interface CollectionStats {
  totalRecords: number
  recordsWithEmail: number
  recordsWithWebsite: number
  uniqueSubsectors: number
  avgStars: string
}

export default function ResultsPage() {
  const [collections, setCollections] = useState<string[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/collections")
        const data = await response.json()

        if (data.collections && data.collections.length > 0) {
          setCollections(data.collections)

          // Set restaurants as the default collection if it exists
          if (data.collections.includes("restaurants")) {
            setSelectedCollection("restaurants")
          } else {
            setSelectedCollection(data.collections[0])
          }
        } else {
          // Fallback to restaurants if no collections returned
          setCollections(["restaurants"])
          setSelectedCollection("restaurants")
        }
      } catch (err) {
        console.error("Failed to fetch collections:", err)
        setError("Failed to fetch collections")

        // Fallback to restaurants on error
        setCollections(["restaurants"])
        setSelectedCollection("restaurants")
      }
    }

    fetchCollections()
  }, [])

  // Fetch businesses when collection changes or search/page changes
  useEffect(() => {
    if (!selectedCollection) return

    const fetchBusinesses = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log(`Fetching businesses from ${selectedCollection}, page ${currentPage}`)
        const response = await fetch(
          `/api/businesses/${selectedCollection}?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("API response:", data)

        if (data.error) {
          console.error("API returned error:", data.error)
          throw new Error(data.error)
        }

        if (data.data && Array.isArray(data.data)) {
          setBusinesses(data.data)
          setTotalPages(data.pagination.totalPages)
          setStats(data.stats)
        }
      } catch (err) {
        console.error("Error fetching business data:", err)
        setError(`Failed to fetch business data: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [selectedCollection, currentPage, searchTerm])

  // Handle collection change
  const handleCollectionChange = (collection: string) => {
    setSelectedCollection(collection)
    setCurrentPage(1)
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Truncate long URLs
  const truncateUrl = (url: string, maxLength = 30) => {
    if (!url) return ""
    const cleanUrl = url.replace(/^https?:\/\//, "")
    return cleanUrl.length > maxLength ? cleanUrl.substring(0, maxLength) + "..." : cleanUrl
  }

  // Export data as CSV
  const exportToCSV = async () => {
    setIsLoading(true)
    try {
      // Fetch all data for the selected collection (no pagination)
      const response = await fetch(
        `/api/businesses/${selectedCollection}?limit=10000&search=${encodeURIComponent(searchTerm)}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        // Filter businesses with emails
        const businessesWithEmail = data.data.filter((business) => {
          const hasEmail =
            business.email && (Array.isArray(business.email) ? business.email.length > 0 : business.email !== "")
          return hasEmail
        })

        exportBusinessesToCSV(businessesWithEmail)
      }
    } catch (err) {
      console.error("Failed to export data:", err)
      setError("Failed to export data")
    } finally {
      setIsLoading(false)
    }
  }

  const exportBusinessesToCSV = (businesses: Business[]) => {
    // Create CSV header
    const header = "Business Name,Address,Phone Number,Website,Email\n"

    // Create CSV rows
    const rows = businesses
      .map((business: Business) => {
        const emails = Array.isArray(business.email) ? business.email.join("; ") : business.email

        return [
          `"${business.businessname || ""}"`,
          `"${business.address || ""}"`,
          `"${business.phonenumber || ""}"`,
          `"${business.website || ""}"`,
          `"${emails || ""}"`,
        ].join(",")
      })
      .join("\n")

    // Create and download CSV file
    const csvContent = header + rows
    downloadCSV(csvContent, `${selectedCollection}_data.csv`)
  }

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter businesses to only show those with emails
  const filteredBusinesses = businesses.filter((business) => {
    const hasEmail =
      business.email && (Array.isArray(business.email) ? business.email.length > 0 : business.email !== "")
    return hasEmail
  })

  return (
    <AppLayout activeTab="results">
      <div className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsTitle}>
            <h2>Businesses with Email</h2>
            {stats && (
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Records:</span>
                  <span className={styles.statValue}>{stats.totalRecords}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>With Email:</span>
                  <span className={styles.statValue}>{stats.recordsWithEmail}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>With Website:</span>
                  <span className={styles.statValue}>{stats.recordsWithWebsite}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.resultsActions}>
            <form onSubmit={handleSearch} className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton}>
                Search
              </button>
            </form>

            <button
              className={styles.exportButton}
              onClick={exportToCSV}
              disabled={isLoading || filteredBusinesses.length === 0}
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Collection Selector */}
        <div className={styles.collectionSelector}>
          <label htmlFor="collection">Select Collection:</label>
          <select
            id="collection"
            value={selectedCollection}
            onChange={(e) => handleCollectionChange(e.target.value)}
            className={styles.collectionSelect}
            disabled={isLoading}
          >
            {collections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Loader size={40} className={styles.loadingSpinner} />
            <p>Loading data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className={styles.errorContainer}>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Business List */}
        {!isLoading && (
          <>
            <div className={styles.businessList}>
              {filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((business, index) => (
                  <div key={business._id || index} className={styles.businessCard}>
                    <h3 className={styles.businessName}>{business.businessname || "Unnamed Business"}</h3>

                    <div className={styles.businessDetails}>
                      {business.address && (
                        <div className={styles.businessDetail}>
                          <MapPin size={16} />
                          <span>{business.address}</span>
                        </div>
                      )}

                      {business.phonenumber && (
                        <div className={styles.businessDetail}>
                          <Phone size={16} />
                          <span>{business.phonenumber}</span>
                        </div>
                      )}

                      {business.website && (
                        <div className={styles.businessDetail}>
                          <Globe size={16} />
                          <a href={business.website} target="_blank" rel="noopener noreferrer">
                            {truncateUrl(business.website)}
                          </a>
                        </div>
                      )}

                      {business.email && (
                        <div className={styles.businessDetail}>
                          <Mail size={16} />
                          <div className={styles.emailList}>
                            {Array.isArray(business.email) ? (
                              business.email.map((email, index) => (
                                <a key={index} href={`mailto:${email}`} className={styles.emailItem}>
                                  {email}
                                </a>
                              ))
                            ) : (
                              <a href={`mailto:${business.email}`} className={styles.emailItem}>
                                {business.email}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>
                  <p>No businesses with email addresses found.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </button>

                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show pages around current page
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i
                    }
                    if (currentPage > totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`${styles.pageButton} ${currentPage === pageNum ? styles.activePage : ""}`}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
