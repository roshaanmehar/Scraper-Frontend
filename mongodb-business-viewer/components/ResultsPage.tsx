"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Download, Search, MapPin, Phone, Globe, Mail, Loader } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/ResultsPage.module.css"
import { mockBusinessData } from "@/lib/mock-data"

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
  const [useMockData, setUseMockData] = useState(false)

  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/collections")
        const data = await response.json()

        if (data.collections && data.collections.length > 0) {
          setCollections(data.collections)
          setSelectedCollection(data.collections[0])
        } else {
          // If no collections, use mock data
          setUseMockData(true)
          setCollections(["restaurants", "cafes", "hotels"])
          setSelectedCollection("restaurants")
        }
      } catch (err) {
        console.error("Failed to fetch collections:", err)
        setError("Failed to fetch collections")
        // Use mock data as fallback
        setUseMockData(true)
        setCollections(["restaurants", "cafes", "hotels"])
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

      if (useMockData) {
        // Use mock data directly
        setTimeout(() => {
          setBusinesses(mockBusinessData)
          setTotalPages(1)
          setStats({
            totalRecords: mockBusinessData.length,
            recordsWithEmail: mockBusinessData.filter((b) => b.email).length,
            recordsWithWebsite: mockBusinessData.filter((b) => b.website).length,
            uniqueSubsectors: 5,
            avgStars: "4.2",
          })
          setIsLoading(false)
        }, 500) // Simulate loading
        return
      }

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
        } else {
          console.warn("No data from API, using mock data instead")
          // Use mock data as fallback
          setBusinesses(mockBusinessData)
          setTotalPages(1)
          setStats({
            totalRecords: mockBusinessData.length,
            recordsWithEmail: mockBusinessData.filter((b) => b.email).length,
            recordsWithWebsite: mockBusinessData.filter((b) => b.website).length,
            uniqueSubsectors: 5,
            avgStars: "4.2",
          })
        }
      } catch (err) {
        console.error("Error fetching business data:", err)
        setError(`Failed to fetch business data: ${err instanceof Error ? err.message : String(err)}`)

        // Use mock data as fallback on error
        setBusinesses(mockBusinessData)
        setTotalPages(1)
        setStats({
          totalRecords: mockBusinessData.length,
          recordsWithEmail: mockBusinessData.filter((b) => b.email).length,
          recordsWithWebsite: mockBusinessData.filter((b) => b.website).length,
          uniqueSubsectors: 5,
          avgStars: "4.2",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [selectedCollection, currentPage, searchTerm, useMockData])

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

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      return "N/A"
    }
  }

  // Truncate long URLs
  const truncateUrl = (url: string, maxLength: number) => {
    const cleanUrl = url.replace(/^https?:\/\//, "")
    return cleanUrl.length > maxLength ? cleanUrl.substring(0, maxLength) + "..." : cleanUrl
  }

  // Export data as CSV
  const exportToCSV = async () => {
    setIsLoading(true)
    try {
      // If using mock data, export that directly
      if (useMockData) {
        exportMockDataToCSV()
        return
      }

      // Fetch all data for the selected collection (no pagination)
      const response = await fetch(
        `/api/businesses/${selectedCollection}?limit=10000&search=${encodeURIComponent(searchTerm)}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        exportBusinessesToCSV(data.data)
      } else {
        // Fallback to mock data
        exportMockDataToCSV()
      }
    } catch (err) {
      console.error("Failed to export data:", err)
      setError("Failed to export data")
      // Fallback to mock data
      exportMockDataToCSV()
    } finally {
      setIsLoading(false)
    }
  }

  const exportBusinessesToCSV = (businesses: Business[]) => {
    // Create CSV header
    const header = "Business Name,Address,Phone Number,Website,Email,Stars,Reviews,Subsector,Scraped At\n"

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
          `"${business.stars || ""}"`,
          `"${business.numberofreviews || ""}"`,
          `"${business.subsector || ""}"`,
          `"${formatDate(business.scraped_at)}"`,
        ].join(",")
      })
      .join("\n")

    // Create and download CSV file
    const csvContent = header + rows
    downloadCSV(csvContent, `${selectedCollection}_data.csv`)
  }

  const exportMockDataToCSV = () => {
    // Create CSV header
    const header = "Business Name,Address,Phone Number,Website,Email,Category\n"

    // Create CSV rows
    const rows = mockBusinessData
      .map((business) => {
        return [
          `"${business.name || ""}"`,
          `"${business.address || ""}"`,
          `"${business.phone || ""}"`,
          `"${business.website || ""}"`,
          `"${business.email || ""}"`,
          `"${business.category || ""}"`,
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

  // Toggle between real and mock data
  const toggleMockData = () => {
    setUseMockData(!useMockData)
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

            <button
              className={styles.exportButton}
              onClick={exportToCSV}
              disabled={isLoading || businesses.length === 0}
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
              {!useMockData && (
                <button onClick={() => setUseMockData(true)} className={styles.useMockButton}>
                  Use Mock Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Business List */}
        {!isLoading && (
          <>
            <div className={styles.businessList}>
              {businesses.length > 0 ? (
                businesses
                  .filter((business) => {
                    // Only show businesses with emails
                    const hasEmail =
                      business.email &&
                      (Array.isArray(business.email) ? business.email.length > 0 : business.email !== "")
                    return hasEmail
                  })
                  .map((business, index) => (
                    <div key={business._id || index} className={styles.businessCard}>
                      <h3 className={styles.businessName}>
                        {business.businessname || business.name || "Unnamed Business"}
                      </h3>

                      <div className={styles.businessDetails}>
                        {business.address && (
                          <div className={styles.businessDetail}>
                            <MapPin size={16} />
                            <span>{business.address}</span>
                          </div>
                        )}

                        {(business.phonenumber || business.phone) && (
                          <div className={styles.businessDetail}>
                            <Phone size={16} />
                            <span>{business.phonenumber || business.phone}</span>
                          </div>
                        )}

                        {business.website && (
                          <div className={styles.businessDetail}>
                            <Globe size={16} />
                            <a href={business.website} target="_blank" rel="noopener noreferrer">
                              {truncateUrl(business.website, 30)}
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
