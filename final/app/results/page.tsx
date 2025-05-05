"use client"

import { getRestaurants } from "@/lib/mongodb"
import RestaurantList from "@/components/restaurant-list"
import SearchForm from "@/components/search-form"
import styles from "./page.module.css"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const search = typeof searchParams.search === "string" ? searchParams.search : ""
  const sortBy = typeof searchParams.sortBy === "string" ? searchParams.sortBy : "businessname"
  const sortOrder = typeof searchParams.sortOrder === "string" ? searchParams.sortOrder : "asc"
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1

  const { restaurants, totalPages } = await getRestaurants({
    search,
    sortBy,
    sortOrder,
    page,
  })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Restaurant Results</h1>

      <SearchForm initialSearch={search} />

      <div className={styles.sortContainer}>
        <label htmlFor="sortBy">Sort by:</label>
        <select
          id="sortBy"
          className={styles.select}
          onChange={(e) => {
            const url = new URL(window.location.href)
            url.searchParams.set("sortBy", e.target.value)
            window.location.href = url.toString()
          }}
          defaultValue={sortBy}
        >
          <option value="businessname">Business Name</option>
          <option value="stars">Rating</option>
          <option value="numberofreviews">Number of Reviews</option>
        </select>

        <select
          id="sortOrder"
          className={styles.select}
          onChange={(e) => {
            const url = new URL(window.location.href)
            url.searchParams.set("sortOrder", e.target.value)
            window.location.href = url.toString()
          }}
          defaultValue={sortOrder}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <RestaurantList restaurants={restaurants} currentPage={page} totalPages={totalPages} />

      <div className={styles.exportContainer}>
        <a href={`/api/export-csv?search=${search}`} className={styles.exportButton}>
          Export to CSV
        </a>
      </div>
    </div>
  )
}
