"use client"

import { Send, Loader, Mail } from "lucide-react"
import { useRipple } from "@/hooks/useRipple"
import { useLogStore } from "@/stores/logStore"
import styles from "@/styles/tabs/EmailsTab.module.css"

interface EmailsTabProps {
  isEmailScraping: boolean
  setIsEmailScraping: (isEmailScraping: boolean) => void
  emailsFound: number
  setEmailsFound: (emailsFound: number) => void
  setActiveTab: (tab: string) => void
}

export default function EmailsTab({
  isEmailScraping,
  setIsEmailScraping,
  emailsFound,
  setEmailsFound,
  setActiveTab,
}: EmailsTabProps) {
  const { createRipple } = useRipple()
  const { addLog } = useLogStore()

  const startEmailScraping = () => {
    setIsEmailScraping(true)
    setActiveTab("tasks") // Switch to tasks tab to show progress

    addLog("Starting email scraper...")
    addLog("Initializing email extraction process")
    addLog("Loading website URLs from database...")

    // Simulate email scraping process
    let emailCount = 0
    let websiteCount = 0

    const interval = setInterval(() => {
      const newWebsites = Math.floor(Math.random() * 3) + 1
      websiteCount += newWebsites

      addLog(`Processing ${newWebsites} website${newWebsites === 1 ? "" : "s"} (total: ${websiteCount})`)

      if (Math.random() > 0.4) {
        const newEmails = Math.floor(Math.random() * 3) + 1
        emailCount += newEmails
        setEmailsFound(emailCount)

        addLog(`Found ${newEmails} new email${newEmails === 1 ? "" : "s"} (total: ${emailCount})`)

        // Simulate some random email addresses
        if (Math.random() > 0.7) {
          const domain = ["gmail.com", "yahoo.com", "hotmail.com", "business.com", "company.co.uk"][
            Math.floor(Math.random() * 5)
          ]
          addLog(`Email found: contact@example${Math.floor(Math.random() * 1000)}.${domain}`)
        }
      } else {
        addLog(`No emails found on current website`)
      }

      if (websiteCount >= 25 || Math.random() > 0.9) {
        clearInterval(interval)
        addLog("Email scraping completed successfully")
        addLog(`Total websites processed: ${websiteCount}`)
        addLog(`Total emails extracted: ${emailCount}`)
        addLog("Email data saved to emails_export.csv")
        setIsEmailScraping(false)
      }
    }, 2000)
  }

  return (
    <div className={styles.emailsTab}>
      <h2 className={styles.sectionTitle}>Email Scraper</h2>

      <div className={styles.emailsContent}>
        <div className={styles.emailsDescription}>
          <p>Extract email addresses from business websites found during scraping.</p>
          <p>The email scraper will visit each business website and search for valid email addresses on the pages.</p>
        </div>

        <div className={styles.emailsActionContainer}>
          <button
            className={`${styles.emailScrapeButton} ${isEmailScraping ? styles.emailScrapeButtonActive : ""}`}
            onClick={(e) => {
              if (!isEmailScraping) {
                startEmailScraping()
              }
              createRipple(e)
            }}
            disabled={isEmailScraping}
          >
            {isEmailScraping ? (
              <>
                <Loader size={20} className={styles.spinningIcon} /> Scraping Emails...
              </>
            ) : (
              <>
                <Send size={20} /> Scrape Emails
              </>
            )}
          </button>
        </div>

        {emailsFound > 0 && (
          <div className={styles.emailsStats}>
            <div className={styles.emailStatCard}>
              <div className={styles.emailStatIcon}>
                <Mail size={24} />
              </div>
              <div className={styles.emailStatInfo}>
                <h3>Emails Found</h3>
                <p>{emailsFound}</p>
              </div>
            </div>
          </div>
        )}

        <div className={styles.emailsNote}>
          <p>Note: Email scraping results will be displayed in the Tasks tab.</p>
        </div>
      </div>
    </div>
  )
}
