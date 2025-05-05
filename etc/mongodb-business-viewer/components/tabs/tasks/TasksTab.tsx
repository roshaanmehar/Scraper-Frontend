"use client"

import { useRef, useEffect } from "react"
import { Terminal } from "lucide-react"
import { useLogStore } from "@/stores/logStore"
import styles from "@/styles/tabs/TasksTab.module.css"

interface TasksTabProps {
  isRunning: boolean
  isEmailScraping: boolean
  isPostcodeScraping: boolean
}

export default function TasksTab({ isRunning, isEmailScraping, isPostcodeScraping }: TasksTabProps) {
  const { logs } = useLogStore()
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when logs update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  return (
    <div className={styles.tasksTab}>
      <div className={styles.tasksHeader}>
        <h2>
          <Terminal size={18} /> Tasks
          {(isRunning || isEmailScraping || isPostcodeScraping) && (
            <span className={styles.runningIndicator}>
              {isRunning ? "Scraping" : isEmailScraping ? "Email Scraping" : "Postcode Scraping"}
            </span>
          )}
        </h2>
        <span className={styles.taskCount}>{logs.length} entries</span>
      </div>
      <div className={styles.tasks}>
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className={styles.taskEntry}>
              {log}
            </div>
          ))
        ) : (
          <div className={styles.emptyTasks}>No tasks yet. Start the scraper to see activity.</div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
