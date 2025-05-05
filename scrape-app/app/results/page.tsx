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
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            </div>

            <button className="btn btn-secondary">Export</button>
          </div>
        </div>
      </div>

      <div className="results-list">
        <div className="result-item">
          <h3>Sample Result 1</h3>
          <p>This is a placeholder for result data. The actual results would appear here.</p>
        </div>

        <div className="result-item">
          <h3>Sample Result 2</h3>
          <p>This is a placeholder for result data. The actual results would appear here.</p>
        </div>

        <div className="result-item">
          <h3>Sample Result 3</h3>
          <p>This is a placeholder for result data. The actual results would appear here.</p>
        </div>
      </div>

      <div className="navigation">
        <Link href="/">
          <button className="btn btn-outline">Back to Search</button>
        </Link>
      </div>
    </div>
  )
}
