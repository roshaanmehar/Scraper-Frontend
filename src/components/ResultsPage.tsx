"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Download,
  Search,
  MapPin,
  Phone,
  Globe,
  Mail,
  Loader,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react"
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

type SortField = "businessname" | "stars" | "numberofreviews" | "scraped_at"
type SortOrder = "asc" | "desc"

export default function ResultsPage() {
  const [collections, setCollections] = useState<string[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("restaurants")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("businessname")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/collections")
        const data = await response.json()

        if (data.collections && data.collections.length > 0) {
          // Filter out subsector_queue from collections
          const filteredCollections = data.collections.filter((collection: string) => collection !== "subsector_queue")

          setCollections(filteredCollections)

          // Set restaurants as the default collection if it exists
          if (filteredCollections.includes("restaurants")) {
            setSelectedCollection("restaurants")
          } else if (filteredCollections.length > 0) {
            setSelectedCollection(filteredCollections[0])
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
          `/api/businesses/${selectedCollection}?page=${currentPage}&search=${encodeURIComponent(searchTerm)}&sortField=${sortField}&sortOrder=${sortOrder}`,
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
          // Filter out any businesses without valid emails (extra safety check)
          const validBusinesses = data.data.filter((business) => {
            if (!business.email) return false

            if (Array.isArray(business.email)) {
              return business.email.length > 0 && business.email.some((e) => e && e !== "N/A")
            }

            return business.email && business.email !== "N/A" && business.email !== ""
          })

          setBusinesses(validBusinesses)
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
  }, [selectedCollection, currentPage, searchTerm, sortField, sortOrder])

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

  // Handle sort field change
  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new field and default to ascending
      setSortField(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ArrowUpDown size={16} className={styles.sortIcon} />
    return sortOrder === "asc" ? (
      <ArrowUp size={16} className={styles.sortIcon} />
    ) : (
      <ArrowDown size={16} className={styles.sortIcon} />
    )
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

  // Export data as CSV
  const exportToCSV = async () => {
    setIsLoading(true)
    setExportStatus("Fetching data...")
    try {
      // Fetch all data for the selected collection (no pagination)
      const response = await fetch(
        `/api/businesses/${selectedCollection}?limit=10000&search=${encodeURIComponent(searchTerm)}&sortField=${sortField}&sortOrder=${sortOrder}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setExportStatus("Processing data...")

      if (data.data && Array.isArray(data.data)) {
        // Filter businesses with valid emails
        const businessesWithEmail = data.data.filter((business) => isValidEmail(business.email))

        if (businessesWithEmail.length === 0) {
          setExportStatus("No data to export")
          setTimeout(() => setExportStatus(null), 3000)
          return
        }

        setExportStatus("Creating CSV...")
        exportBusinessesToCSV(businessesWithEmail)
      }
    } catch (err) {
      console.error("Failed to export data:", err)
      setError("Failed to export data")
      setExportStatus("Export failed")
      setTimeout(() => setExportStatus(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const exportBusinessesToCSV = (businesses: Business[]) => {
    try {
      // Create CSV header
      const header = "Business Name,Address,Phone Number,Website,Email\n"

      // Create CSV rows
      const rows = businesses
        .map((business: Business) => {
          const emails = getValidEmails(business.email).join("; ")

          return [
            `"${(business.businessname || "").replace(/"/g, '""')}"`,
            `"${(business.address || "").replace(/"/g, '""')}"`,
            `"${(business.phonenumber || "").toString().replace(/"/g, '""')}"`,
            `"${(business.website || "").replace(/"/g, '""')}"`,
            `"${emails.replace(/"/g, '""')}"`,
          ].join(",")
        })
        .join("\n")

      // Create and download CSV file
      const csvContent = header + rows
      setExportStatus("Downloading...")
      downloadCSV(csvContent, `${selectedCollection}_data.csv`)

      // Show success message
      setExportStatus("Export successful!")
      setTimeout(() => setExportStatus(null), 3000)
    } catch (error) {
      console.error("Error creating CSV:", error)
      setExportStatus("Export failed")
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  const downloadCSV = (csvContent: string, filename: string) => {
    try {
      console.log("Creating blob for download")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      console.log("Blob created:", blob.size, "bytes")

      // Create download link
      const url = URL.createObjectURL(blob)
      console.log("URL created:", url)

      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)

      console.log("Triggering download")
      link.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        console.log("Download cleanup complete")
      }, 100)
    } catch (error) {
      console.error("Download error:", error)
      setExportStatus("Download failed")
      setTimeout(() => setExportStatus(null), 3000)
    }
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

            <div className={styles.exportContainer}>
              <button
                className={styles.exportButton}
                onClick={exportToCSV}
                disabled={isLoading || businesses.length === 0}
              >
                {isLoading && exportStatus ? (
                  <Loader size={18} className={styles.spinnerIcon} />
                ) : (
                  <Download size={18} />
                )}
                <span>{exportStatus || "Export"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collection and Sort Controls */}
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

          <div className={styles.sortControls}>
            <span className={styles.sortLabel}>Sort by:</span>
            <div className={styles.sortButtons}>
              <button
                className={`${styles.sortButton} ${sortField === "businessname" ? styles.activeSortButton : ""}`}
                onClick={() => handleSortFieldChange("businessname")}
                disabled={isLoading}
              >
                Name {getSortIcon("businessname")}
              </button>
              <button
                className={`${styles.sortButton} ${sortField === "stars" ? styles.activeSortButton : ""}`}
                onClick={() => handleSortFieldChange("stars")}
                disabled={isLoading}
              >
                Rating {getSortIcon("stars")}
              </button>
              <button
                className={`${styles.sortButton} ${sortField === "numberofreviews" ? styles.activeSortButton : ""}`}
                onClick={() => handleSortFieldChange("numberofreviews")}
                disabled={isLoading}
              >
                Reviews {getSortIcon("numberofreviews")}
              </button>
              <button
                className={`${styles.sortButton} ${sortField === "scraped_at" ? styles.activeSortButton : ""}`}
                onClick={() => handleSortFieldChange("scraped_at")}
                disabled={isLoading}
              >
                Date {getSortIcon("scraped_at")}
              </button>
            </div>
          </div>
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

                          {business.website && business.website !== "N/A" && (
                            <div className={styles.businessDetail}>
                              <Globe size={16} />
                              <a href={business.website} target="_blank" rel="noopener noreferrer">
                                {truncateUrl(business.website)}
                              </a>
                            </div>
                          )}

                          {validEmails.length > 0 && (
                            <div className={styles.businessDetail}>
                              <Mail size={16} />
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
                    <AlertCircle size={20} className={styles.alertIcon} />
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
