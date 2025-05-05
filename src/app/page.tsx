"use client"

import ScraperForm from "@/components/ScraperForm"
import styles from "@/styles/Home.module.css"

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Business Data Scraper</h1>
        <p className={styles.subtitle}>Automate scraping of business data from postcodes to emails</p>
      </header>

      <main className={styles.main}>
        <ScraperForm />

        <div className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Postcode Scraping</h3>
                <p className={styles.stepDescription}>
                  The system scrapes postcode data for the specified city and organizes it into sectors and subsectors.
                </p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Google Maps Business Scraping</h3>
                <p className={styles.stepDescription}>
                  For each subsector, the system scrapes business information from Google Maps, including names,
                  addresses, phone numbers, and websites.
                </p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Email & Social Media Scraping</h3>
                <p className={styles.stepDescription}>
                  The system visits each business website to extract email addresses and social media profiles,
                  completing the data collection process.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Business Data Scraper</p>
      </footer>
    </div>
  )
}
