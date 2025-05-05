import type { Metadata } from "next"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Leeds Restaurant Finder",
  description: "Search for restaurants in Leeds",
}

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Leeds Restaurant Finder</h1>
      <form action="/results" method="get" className={styles.searchForm}>
        <div className={styles.formGroup}>
          <label htmlFor="city">City:</label>
          <input type="text" id="city" name="city" className={styles.input} placeholder="Enter city name" />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="keyword">Keyword:</label>
          <input type="text" id="keyword" name="keyword" className={styles.input} placeholder="Enter keyword" />
        </div>

        <button type="submit" className={styles.button}>
          Search Restaurants
        </button>
      </form>
    </div>
  )
}
