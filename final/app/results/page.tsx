import { Suspense } from "react"
import type { Metadata } from "next"
import RestaurantResults from "@/components/restaurant-results"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Restaurant Results | Leeds Restaurant Finder",
  description: "Search results for restaurants in Leeds",
}

export default function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const city = typeof searchParams.city === "string" ? searchParams.city : ""
  const keyword = typeof searchParams.keyword === "string" ? searchParams.keyword : ""
  const search = city || keyword || ""

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Restaurant Results</h1>
      {city && <p className={styles.searchInfo}>City: {city}</p>}
      {keyword && <p className={styles.searchInfo}>Keyword: {keyword}</p>}

      <Suspense fallback={<div className={styles.loading}>Loading restaurants...</div>}>
        <RestaurantResults search={search} />
      </Suspense>

      <div className={styles.backLink}>
        <a href="/" className={styles.button}>
          Back to Search
        </a>
      </div>
    </div>
  )
}
