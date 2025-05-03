"use client"

import { useState, useEffect } from "react"
import styles from "@/styles/tabs/DashboardTab.module.css"

interface DashboardTabProps {
  totalCards: number
  emailsFound: number
}

export default function DashboardTab({ totalCards, emailsFound }: DashboardTabProps) {
  // Chart data for dashboard
  const [weeklyData, setWeeklyData] = useState<number[]>([])
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const [maxValue, setMaxValue] = useState(0)

  useEffect(() => {
    // Generate random data for the chart
    const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 90) + 10)
    setWeeklyData(data)
    setMaxValue(Math.max(...data))
  }, [])

  return (
    <div className={styles.dashboardTab}>
      <h2 className={styles.sectionTitle}>Scraping Metrics</h2>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <h3>Total Records</h3>
          <div className={styles.metricValue}>{totalCards}</div>
          <div className={styles.metricSubtext}>All time</div>
        </div>

        <div className={styles.metricCard}>
          <h3>Success Rate</h3>
          <div className={styles.metricValue}>98.2%</div>
          <div className={styles.metricSubtext}>Last 7 days</div>
        </div>

        <div className={styles.metricCard}>
          <h3>Avg. Time</h3>
          <div className={styles.metricValue}>14.3s</div>
          <div className={styles.metricSubtext}>Per record</div>
        </div>

        <div className={styles.metricCard}>
          <h3>Emails Found</h3>
          <div className={styles.metricValue}>{emailsFound || Math.floor(totalCards * 0.62)}</div>
          <div className={styles.metricSubtext}>Valid emails</div>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h3>Weekly Scraping Activity</h3>
        <div className={styles.barChart}>
          {weeklyData.map((value, index) => (
            <div key={index} className={styles.barContainer}>
              <div className={styles.bar} style={{ height: `${(value / maxValue) * 100}%` }}>
                <span className={styles.barValue}>{value}</span>
              </div>
              <div className={styles.barLabel}>{weekDays[index]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
