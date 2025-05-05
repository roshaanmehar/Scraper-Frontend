import Link from "next/link"
import styles from "./page.module.css"

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Leeds Restaurant Finder</h1>
      <div className={styles.searchForm}>
        <div className={styles.formGroup}>
          <label htmlFor="city">City:</label>
          <input type="text" id="city" name="city" className={styles.input} placeholder="Enter city name" />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="keyword">Keyword:</label>
          <input type="text" id="keyword" name="keyword" className={styles.input} placeholder="Enter keyword" />
        </div>

        <Link href="/results" className={styles.button}>
          Search Restaurants
        </Link>
      </div>
    </div>
  )
}
