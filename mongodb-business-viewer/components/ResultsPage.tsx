"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Download,
  Search,
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Mail,
  Tag,
  Database,
  Star,
  Calendar,
  Loader,
} from "lucide-react"
import Link from "next/link"
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
          setSelectedCollection(data.collections[0])
        }
      } catch (err) {
        setError("Failed to fetch collections")
        console.error(err)
      }
    }

    fetchCollections()
  }, [])

  // Fetch businesses when collection changes or search/page changes
  useEffect(() => {
    if (!selectedCollection) return

    const fetchBusinesses = async () => {
      setIsLoading(true)
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

        if (data.data) {
          setBusinesses(data.data)
          setTotalPages(data.pagination.totalPages)
          setStats(data.stats)
        } else {
          console.warn("No data property in API response")
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

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Export data as CSV
  const exportToCSV = async () => {
    setIsLoading(true)
    try {
      // Fetch all data for the selected collection (no pagination)
      const response = await fetch(
        `/api/businesses/${selectedCollection}?limit=10000&search=${encodeURIComponent(searchTerm)}`,
      )
      const data = await response.json()

      if (data.data) {
        const businesses = data.data

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
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `${selectedCollection}_data.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      setError("Failed to export data")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout activeTab="results">
      <div className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <div className={styles.resultsTitle}>
            <h2>Business Data</h2>
            {stats && <span className={styles.resultCount}>{stats.recordsWithEmail} businesses with email found</span>}
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
              <span>Export CSV</span>
            </button>

            <Link href="/" className={styles.backButton}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </Link>
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

        {/* Stats Cards */}
        {stats && (
          <div className={styles.resultsStats}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Database size={20} />
              </div>
              <div>
                <h3>Total Records</h3>
                <p>{stats.totalRecords}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Mail size={20} />
              </div>
              <div>
                <h3>With Email</h3>
                <p>{stats.recordsWithEmail}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Globe size={20} />
              </div>
              <div>
                <h3>With Website</h3>
                <p>{stats.recordsWithWebsite}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Star size={20} />
              </div>
              <div>
                <h3>Avg. Rating</h3>
                <p>{stats.avgStars}</p>
              </div>
            </div>
          </div>
        )}

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
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Business List */}
        {!isLoading && !error && (
          <>
            <div className={styles.businessList}>
              {businesses.length > 0 ? (
                businesses.map((business) => (
                  <div key={business._id} className={styles.businessCard}>
                    <h3 className={styles.businessName}>{business.businessname || "Unnamed Business"}</h3>

                    <div className={styles.businessMeta}>
                      {business.stars && (
                        <div className={styles.businessRating}>
                          <Star size={16} className={styles.starIcon} />
                          <span>{business.stars}</span>
                          {business.numberofreviews && (
                            <span className={styles.reviewCount}>({business.numberofreviews} reviews)</span>
                          )}
                        </div>
                      )}

                      {business.subsector && (
                        <div className={styles.businessCategory}>
                          <Tag size={14} />
                          <span>{business.subsector}</span>
                        </div>
                      )}

                      {business.scraped_at && (
                        <div className={styles.businessDate}>
                          <Calendar size={14} />
                          <span>{formatDate(business.scraped_at)}</span>
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

                      {business.website && (
                        <div className={styles.businessDetail}>
                          <Globe size={16} />
                          <a href={business.website} target="_blank" rel="noopener noreferrer">
                            {business.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}

                      {business.email && (
                        <div className={styles.businessDetail}>
                          <Mail size={16} />
                          <div className={styles.emailList}>
                            {Array.isArray(business.email) ? (
                              business.email.map((email, index) => (
                                <a key={index} href={`mailto:${email}`}>
                                  {email}
                                </a>
                              ))
                            ) : (
                              <a href={`mailto:${business.email}`}>{business.email}</a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>
                  <p>No businesses found matching your search criteria.</p>
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
