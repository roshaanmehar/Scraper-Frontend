import Link from "next/link"
import type { Restaurant } from "@/lib/types"
import styles from "./restaurant-list.module.css"

interface RestaurantListProps {
  restaurants: Restaurant[]
  currentPage: number
  totalPages: number
}

export default function RestaurantList({ restaurants, currentPage, totalPages }: RestaurantListProps) {
  return (
    <div>
      <div className={styles.restaurantGrid}>
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <div key={restaurant._id.toString()} className={styles.card}>
              <h2 className={styles.businessName}>{restaurant.businessname}</h2>

              {restaurant.website && (
                <p className={styles.website}>
                  <strong>Website:</strong>{" "}
                  <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                    {truncateText(restaurant.website, 30)}
                  </a>
                </p>
              )}

              {restaurant.email && restaurant.email.length > 0 && (
                <div className={styles.emails}>
                  <strong>Email{restaurant.email.length > 1 ? "s" : ""}:</strong>
                  <ul>
                    {restaurant.email.map((email, index) => (
                      <li key={index}>
                        <a href={`mailto:${email}`}>{email}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {restaurant.phonenumber && (
                <p className={styles.phone}>
                  <strong>Phone:</strong> {formatPhoneNumber(restaurant.phonenumber)}
                </p>
              )}

              {restaurant.stars && (
                <p className={styles.rating}>
                  <strong>Rating:</strong> {restaurant.stars} ⭐ ({restaurant.numberofreviews} reviews)
                </p>
              )}
            </div>
          ))
        ) : (
          <p className={styles.noResults}>No restaurants found matching your criteria.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {currentPage > 1 && (
            <Link href={`/results?page=${currentPage - 1}`} className={styles.pageLink}>
              Previous
            </Link>
          )}

          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages && (
            <Link href={`/results?page=${currentPage + 1}`} className={styles.pageLink}>
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

function formatPhoneNumber(phone: number): string {
  const phoneStr = phone.toString()
  if (phoneStr.length === 10) {
    return `(${phoneStr.substring(0, 3)}) ${phoneStr.substring(3, 6)}-${phoneStr.substring(6)}`
  }
  return phoneStr
}
