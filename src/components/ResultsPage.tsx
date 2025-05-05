"use client"

import { useState, useEffect } from "react"
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/ResultsPage.module.css"

interface Business {
  _id: string
  businessname: string
  address: string
  phonenumber: string | number
  website: string
  email: string[] | string
  stars: string
  subsector: string
  scraped_at: string | { $date: string }
  numberofreviews?: number
  emailstatus?: string
  emailscraped_at?: string | { $date: string }
}

interface CollectionStats {
  totalRecords: number
  recordsWithEmail: number
  recordsWithWebsite: number
  uniqueSubsectors: number
  avgStars: string
}

export default function ResultsPage() {
  const [collections, setCollections] = useState<string[]>(["restaurants"])
  const [selectedCollection, setSelectedCollection] = useState<string>("restaurants")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Check if email is valid (not empty and not "N/A")
  const isValidEmail = (email: string | string[] | undefined): boolean => {
    if (!email) return false

    if (Array.isArray(email)) {
      return email.length > 0 && email.some((e) => e && e !== "N/A")
    }

    return email !== "N/A" && email !== ""
  }

  // Get valid emails from email field
  const getValidEmails = (email: string | string[] | undefined): string[] => {
    if (!email) return []

    if (Array.isArray(email)) {
      return email.filter((e) => e && e !== "N/A")
    }

    return email !== "N/A" && email !== "" ? [email] : []
  }

  return (
    <AppLayout activeTab="results">
      <div className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsTitle}>
            <h2>Businesses with Email</h2>
          </div>

          <div className={styles.resultsActions}>
            <form onSubmit={handleSearch} className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
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

            <div className={styles.exportContainer}>
              <button
                className={styles.exportButton}
                onClick={() => alert("Export functionality would go here")}
                disabled={isLoading || businesses.length === 0}
              >
                {isLoading ? (
                  <span className={styles.spinnerIcon}>⟳</span>
                ) : (
                  <span>⬇️</span>
                )}
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collection Selector */}
        <div className={styles.controlsRow}>
          <div className={styles.collectionSelector}>
            <label htmlFor="collection">Collection:</label>
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
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <span className={styles.loadingSpinner}>⟳</span>
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
              {businesses.length > 0 ? (
                businesses
                  .map((business, index) => {
                    const validEmails = getValidEmails(business.email)

                    // Skip businesses without valid emails
                    if (validEmails.length === 0) return null

                    return (
                      <div key={business._id || index} className={styles.businessCard}>
                        <div className={styles.businessHeader}>
                          <h3 className={styles.businessName}>{business.businessname || "Unnamed Business"}</h3>
                          {business.stars && (
                            <div className={styles.businessRating}>
                              <span className={styles.stars}>{business.stars}</span>
                              {business.numberofreviews && (
                                <span className={styles.reviewCount}>({business.numberofreviews} reviews)</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={styles.businessDetails}>
                          {business.address && (
                            <div className={styles.businessDetail}>
                              <span>📍</span>
                              <span>{business.address}</span>
                            </div>
                          )}

                          {business.phonenumber && (
                            <div className={styles.businessDetail}>
                              <span>📞</span>
                              <span>{business.phonenumber}</span>
                            </div>
                          )}

                          {business.website && business.website !== "N/A" && (
                            <div className={styles.businessDetail}>
                              <span>🌐</span>
                              <a href={business.website} target="_blank" rel="noopener noreferrer">
                                {truncateUrl(business.website)}
                              </a>
                            </div>
                          )}

                          {validEmails.length > 0 && (
                            <div className={styles.businessDetail}>
                              <span>✉️</span>
                              <div className={styles.emailList}>
                                {validEmails.map((email, idx) => (
                                  <a key={idx} href={`mailto:${email}`} className={styles.emailItem}>
                                    {email}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean) // Remove null entries
              ) : (
                <div className={styles.noResults}>
                  <p>No businesses with valid email addresses found in the "{selectedCollection}" collection.</p>
                  <div className={styles.helpText}>
                    <span>⚠️</span>
                    <div>
                      Please check that:
                      <ul>
                        <li>The "Leeds" database exists in your MongoDB instance</li>
                        <li>The "{selectedCollection}" collection exists in the "Leeds" database</li>
                        <li>There are records in the collection with valid email addresses (not empty or "N/A")</li>
                      </ul>
                      <a href="/api/test-db" target="_blank" rel="noopener noreferrer" className={styles.testLink}>
                        Run Database Test
                      </a>
                    </div>
                  </div>
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
