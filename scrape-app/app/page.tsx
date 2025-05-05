import Link from "next/link"

export default function ScrapePage() {
  return (
    <div className="container">
      <h1>Web Scraper</h1>
      <div className="card">
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input type="text" id="city" name="city" placeholder="Enter city name" />
        </div>

        <div className="form-group">
          <label htmlFor="keyword">Keyword</label>
          <input type="text" id="keyword" name="keyword" placeholder="Enter keyword to search" />
        </div>

        <Link href="/results">
          <button className="btn btn-primary">Start</button>
        </Link>
      </div>
    </div>
  )
}
