import Link from "next/link"
import { searchRestaurants } from "../actions"

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { query: string; page?: string }
}) {
  // Properly handle searchParams - direct access without intermediate variables
  const query = searchParams?.query || ""
  const page = searchParams?.page ? Number.parseInt(searchParams.page) : 1

  const { restaurants, pagination } = await searchRestaurants(query, page)

  // Generate pagination numbers
  const paginationNumbers = []
  const maxVisiblePages = 5

  if (pagination.pages <= maxVisiblePages) {
    // Show all pages if there are fewer than maxVisiblePages
    for (let i = 1; i <= pagination.pages; i++) {
      paginationNumbers.push(i)
    }
  } else {
    // Always show first page
    paginationNumbers.push(1)

    // Calculate start and end of middle section
    let startPage = Math.max(2, page - 1)
    let endPage = Math.min(pagination.pages - 1, page + 1)

    // Adjust if we're near the beginning
    if (page <= 3) {
      endPage = 4
    }

    // Adjust if we're near the end
    if (page >= pagination.pages - 2) {
      startPage = pagination.pages - 3
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      paginationNumbers.push("...")
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      paginationNumbers.push(i)
    }

    // Add ellipsis before last page if needed
    if (endPage < pagination.pages - 1) {
      paginationNumbers.push("...")
    }

    // Always show last page
    paginationNumbers.push(pagination.pages)
  }

  return (
    <div className="container">
      <h1>Search Results: {query}</h1>

      <div className="card">
        <div className="search-controls">
          <div className="search-wrapper">
            <form action="/results/search" method="get">
              <input
                type="text"
                name="query"
                placeholder="Search restaurants..."
                className="search-input"
                defaultValue={query}
              />
              <button type="submit" className="hidden">
                Search
              </button>
            </form>
          </div>

          <div className="action-controls">
            <div className="sort-wrapper">
              <label htmlFor="sort">Sort by:</label>
              <select id="sort" className="sort-select">
                <option value="recent">Most Recent</option>
                <option value="name">Business Name</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            <button className="btn btn-secondary">Export</button>
          </div>
        </div>
      </div>

      <div className="results-summary">
        Found {pagination.total} restaurants matching "{query}"
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
                    {restaurant.email ? (
                      Array.isArray(restaurant.email) ? (
                        restaurant.email.map((email, index) => (
                          <span key={index} className="detail-value">
                            {email}
                          </span>
                        ))
                      ) : (
                        <span className="detail-value">{restaurant.email}</span>
                      )
                    ) : (
                      <span className="detail-value no-data">No email available</span>
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
                  <span className="detail-label">Address:</span>
                  <span className="detail-value address">{restaurant.address || "No address available"}</span>
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
                {restaurant.stars && (
                  <div className="detail-item">
                    <span className="detail-label">Rating:</span>
                    <span className="detail-value">
                      {restaurant.stars} ⭐ ({restaurant.numberofreviews || 0} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">No restaurants found matching "{query}"</div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <Link href={`/results/search?query=${query}&page=${Math.max(1, page - 1)}`}>
            <button className="pagination-btn" disabled={page === 1}>
              Previous
            </button>
          </Link>
          <div className="pagination-numbers">
            {paginationNumbers.map((num, index) =>
              typeof num === "number" ? (
                <Link key={index} href={`/results/search?query=${query}&page=${num}`}>
                  <button className={`pagination-number ${page === num ? "active" : ""}`}>{num}</button>
                </Link>
              ) : (
                <span key={index} className="pagination-ellipsis">
                  {num}
                </span>
              ),
            )}
          </div>
          <Link href={`/results/search?query=${query}&page=${Math.min(pagination.pages, page + 1)}`}>
            <button className="pagination-btn" disabled={page === pagination.pages}>
              Next
            </button>
          </Link>
        </div>
      )}

      <div className="navigation">
        <Link href="/results">
          <button className="btn btn-outline">Back to All Results</button>
        </Link>
      </div>
    </div>
  )
}
