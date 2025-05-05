import Link from "next/link"

// Mock data to use until MongoDB is properly connected
const MOCK_RESTAURANTS = [
  {
    _id: "1",
    businessname: "Malt Shovel",
    phonenumber: 1132637082,
    address: "21 Crab Ln, Armley, Leeds LS12 3AG",
    email: ["7851@greeneking.co.uk"],
    website: "https://www.greeneking.co.uk/pubs/west-yorkshire/malt-shovel-leeds",
    stars: "4.2",
    numberofreviews: 403,
    subsector: "LS12 5",
    emailstatus: "found",
  },
  {
    _id: "2",
    businessname: "The Adelphi",
    phonenumber: 1132453950,
    address: "3-5 Hunslet Rd, Leeds LS10 1JQ",
    email: ["adelphi.leeds@craft-pubs.co.uk"],
    website: "https://www.craft-pubs.co.uk/adelphi-leeds",
    stars: "4.4",
    numberofreviews: 1250,
    subsector: "LS10 1",
    emailstatus: "found",
  },
  {
    _id: "3",
    businessname: "Whitelock's Ale House",
    phonenumber: 1132453950,
    address: "Turk's Head Yard, Leeds LS1 6HB",
    email: ["info@whitelocksleeds.com"],
    website: "https://www.whitelocksleeds.com",
    stars: "4.6",
    numberofreviews: 1876,
    subsector: "LS1 6",
    emailstatus: "found",
  },
  {
    _id: "4",
    businessname: "The Midnight Bell",
    phonenumber: 1132444044,
    address: "101 Water Ln, Leeds LS11 5QN",
    email: ["midnightbell@leedsbrewery.co.uk"],
    website: "https://www.midnightbell.co.uk",
    stars: "4.3",
    numberofreviews: 987,
    subsector: "LS11 5",
    emailstatus: "found",
  },
  {
    _id: "5",
    businessname: "North Bar",
    phonenumber: 1132429674,
    address: "24 New Briggate, Leeds LS1 6NU",
    email: ["info@northbar.com"],
    website: "https://www.northbar.com",
    stars: "4.5",
    numberofreviews: 1120,
    subsector: "LS1 6",
    emailstatus: "found",
  },
  {
    _id: "6",
    businessname: "Belgrave Music Hall",
    phonenumber: 1132346160,
    address: "1-1A Cross Belgrave St, Leeds LS2 8JP",
    email: ["info@belgravemusichall.com", "events@belgravemusichall.com"],
    website: "https://www.belgravemusichall.com",
    stars: "4.4",
    numberofreviews: 2150,
    subsector: "LS2 8",
    emailstatus: "found",
  },
]

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { page?: string; query?: string }
}) {
  // Use mock data for now
  const restaurants = MOCK_RESTAURANTS
  const page = searchParams.page ? Number.parseInt(searchParams.page) : 1

  // Mock pagination data
  const pagination = {
    total: 42, // Mock total count
    pages: 7, // Mock total pages
    currentPage: page,
    limit: 6,
  }

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
      <h1>Search Results</h1>

      <div className="card">
        <div className="search-controls">
          <div className="search-wrapper">
            <input type="text" placeholder="Search restaurants..." className="search-input" />
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
        Found {pagination.total} restaurants
        <div className="mongodb-notice">
          <strong>Note:</strong> To use real MongoDB data, run: <code>npm install mongodb</code>
        </div>
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
                    {restaurant.email && restaurant.email.length > 0 ? (
                      restaurant.email.map((email, index) => (
                        <span key={index} className="detail-value">
                          {email}
                        </span>
                      ))
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
                  <span className="detail-value address">{restaurant.address}</span>
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
                      {restaurant.stars} ⭐ ({restaurant.numberofreviews} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">No restaurants found</div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <Link href={`/results?page=${Math.max(1, page - 1)}`} passHref>
            <button className="pagination-btn" disabled={page === 1}>
              Previous
            </button>
          </Link>
          <div className="pagination-numbers">
            {paginationNumbers.map((num, index) =>
              typeof num === "number" ? (
                <Link key={index} href={`/results?page=${num}`} passHref>
                  <button className={`pagination-number ${page === num ? "active" : ""}`}>{num}</button>
                </Link>
              ) : (
                <span key={index} className="pagination-ellipsis">
                  {num}
                </span>
              ),
            )}
          </div>
          <Link href={`/results?page=${Math.min(pagination.pages, page + 1)}`} passHref>
            <button className="pagination-btn" disabled={page === pagination.pages}>
              Next
            </button>
          </Link>
        </div>
      )}

      <div className="navigation">
        <Link href="/">
          <button className="btn btn-outline">Back to Search</button>
        </Link>
      </div>
    </div>
  )
}
