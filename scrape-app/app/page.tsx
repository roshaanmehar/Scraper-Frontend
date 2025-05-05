import Link from "next/link"

export default function ResultsPage() {
  return (
    <div className="container">
      <h1>Search Results</h1>

      <div className="card">
        <div className="search-controls">
          <div className="search-wrapper">
            <input type="text" placeholder="Search results..." className="search-input" />
          </div>

          <div className="action-controls">
            <div className="sort-wrapper">
              <label htmlFor="sort">Sort by:</label>
              <select id="sort" className="sort-select">
                <option value="relevance">Relevance</option>
                <option value="name">Business Name</option>
                <option value="date">Date Added</option>
              </select>
            </div>

            <button className="btn btn-secondary">Export</button>
          </div>
        </div>
      </div>

      <div className="results-grid">
        <div className="result-card">
          <h3 className="business-name">Acme Corporation</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">contact@acmecorp.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 123-4567</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.acmecorp.com
              </a>
            </div>
          </div>
        </div>

        <div className="result-card">
          <h3 className="business-name">TechSolutions Inc.</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">info@techsolutions.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 987-6543</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.techsolutions.com
              </a>
            </div>
          </div>
        </div>

        <div className="result-card">
          <h3 className="business-name">Global Enterprises</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">hello@globalenterprises.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 456-7890</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.globalenterprises.com
              </a>
            </div>
          </div>
        </div>

        <div className="result-card">
          <h3 className="business-name">Sunshine Bakery</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">orders@sunshinebakery.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 234-5678</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.sunshinebakery.com
              </a>
            </div>
          </div>
        </div>

        <div className="result-card">
          <h3 className="business-name">Green Landscaping</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">service@greenlandscaping.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 876-5432</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.greenlandscaping.com
              </a>
            </div>
          </div>
        </div>

        <div className="result-card">
          <h3 className="business-name">City Dental Clinic</h3>
          <div className="business-details">
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">appointments@citydental.com</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">(555) 345-6789</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Website:</span>
              <a href="#" className="website-link">
                www.citydental.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="pagination">
        <button className="pagination-btn" disabled>
          Previous
        </button>
        <div className="pagination-numbers">
          <button className="pagination-number active">1</button>
          <button className="pagination-number">2</button>
          <button className="pagination-number">3</button>
          <span className="pagination-ellipsis">...</span>
          <button className="pagination-number">10</button>
        </div>
        <button className="pagination-btn">Next</button>
      </div>

      <div className="navigation">
        <Link href="/">
          <button className="btn btn-outline">Back to Search</button>
        </Link>
      </div>
    </div>
  )
}
