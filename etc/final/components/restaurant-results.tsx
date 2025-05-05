import { getRestaurants } from "@/lib/mongodb"
import RestaurantList from "@/components/restaurant-list"
import SearchForm from "@/components/search-form"
import styles from "./restaurant-results.module.css"

export default async function RestaurantResults({
  search = "",
}: {
  search: string
}) {
  // Default values for sorting and pagination
  const sortBy = "businessname"
  const sortOrder = "asc"
  const page = 1

  const { restaurants, totalPages } = await getRestaurants({
    search,
    sortBy,
    sortOrder,
    page,
  })

  return (
    <div>
      <div className={styles.searchContainer}>
        <SearchForm initialSearch={search} />
      </div>

      <div className={styles.sortContainer}>
        <label htmlFor="sortBy">Sort by:</label>
        <select id="sortBy" className={styles.select} defaultValue={sortBy}>
          <option value="businessname">Business Name</option>
          <option value="stars">Rating</option>
          <option value="numberofreviews">Number of Reviews</option>
        </select>

        <select id="sortOrder" className={styles.select} defaultValue={sortOrder}>
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
