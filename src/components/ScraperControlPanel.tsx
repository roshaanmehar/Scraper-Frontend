"use client"

import { useState } from "react"
import Navbar from "@/components/layout/Navbar"
import HomeTab from "@/components/tabs/home/HomeTab"
import EmailsTab from "@/components/tabs/emails/EmailsTab"
import PostcodesTab from "@/components/tabs/postcodes/PostcodesTab"
import DashboardTab from "@/components/tabs/dashboard/DashboardTab"
import TasksTab from "@/components/tabs/tasks/TasksTab"
import { useLogStore } from "@/stores/logStore"
import { useTheme } from "@/hooks/useTheme"
import styles from "@/styles/ScraperControlPanel.module.css"

export default function ScraperControlPanel() {
  // State for active tab
  const [activeTab, setActiveTab] = useState("home")

  // Use theme hook
  const { isDarkMode, toggleTheme } = useTheme()

  // Get logs from store
  const { logs } = useLogStore()

  // State for scraping processes
  const [isRunning, setIsRunning] = useState(false)
  const [isEmailScraping, setIsEmailScraping] = useState(false)
  const [isPostcodeScraping, setIsPostcodeScraping] = useState(false)

  // State for scraping data
  const [progress, setProgress] = useState(0)
  const [totalSectors, setTotalSectors] = useState(0)
  const [currentSector, setCurrentSector] = useState("")
  const [totalCards, setTotalCards] = useState(0)
  const [newUpserts, setNewUpserts] = useState(0)
  const [emailsFound, setEmailsFound] = useState(0)
  const [postcodeResults, setPostcodeResults] = useState({
    totalPostcodes: 0,
    sectors: 0,
    subsectors: 0,
  })

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.gradientBackground}></div>
      <div className={styles.panel}>
        {/* Navbar Component */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isRunning={isRunning}
          isEmailScraping={isEmailScraping}
          isPostcodeScraping={isPostcodeScraping}
          totalCards={totalCards}
          toggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
        />

        {/* Main Content Area */}
        <div className={styles.contentArea}>
          {/* Home Tab */}
          {activeTab === "home" && (
            <HomeTab
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              progress={progress}
              setProgress={setProgress}
              totalSectors={totalSectors}
              setTotalSectors={setTotalSectors}
              currentSector={currentSector}
              setCurrentSector={setCurrentSector}
              totalCards={totalCards}
              setTotalCards={setTotalCards}
              newUpserts={newUpserts}
              setNewUpserts={setNewUpserts}
            />
          )}

          {/* Emails Tab */}
          {activeTab === "emails" && (
            <EmailsTab
              isEmailScraping={isEmailScraping}
              setIsEmailScraping={setIsEmailScraping}
              emailsFound={emailsFound}
              setEmailsFound={setEmailsFound}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Postcodes Tab */}
          {activeTab === "postcodes" && (
            <PostcodesTab
              isPostcodeScraping={isPostcodeScraping}
              setIsPostcodeScraping={setIsPostcodeScraping}
              postcodeResults={postcodeResults}
              setPostcodeResults={setPostcodeResults}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && <DashboardTab totalCards={totalCards} emailsFound={emailsFound} />}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <TasksTab isRunning={isRunning} isEmailScraping={isEmailScraping} isPostcodeScraping={isPostcodeScraping} />
          )}
        </div>
      </div>
    </div>
  )
}
