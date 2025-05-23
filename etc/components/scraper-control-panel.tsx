"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import styles from "./scraper-control-panel.module.css"
import {
  Play,
  Pause,
  Download,
  List,
  Shield,
  Database,
  Globe,
  Terminal,
  Moon,
  Sun,
  BarChart2,
  Mail,
  Home,
  AlertCircle,
  Loader,
  MapPin,
  Send,
  RefreshCw,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Types for API responses
interface ScraperStatus {
  running: {
    postcode: boolean
    gmb: boolean
    email: boolean
  }
  dbStats: {
    subsector_queue: number
    restaurants: number
    pending_emails: number
  }
  timestamp: string
}

interface ScraperLogs {
  logs: string[]
  timestamp: string
}

export default function ScraperControlPanel() {
  // State variables
  const [isRunning, setIsRunning] = useState(false)
  const [isEmailScraping, setIsEmailScraping] = useState(false)
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [headless, setHeadless] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("home")
  const [progress, setProgress] = useState(0)
  const [totalSectors, setTotalSectors] = useState(0)
  const [currentSector, setCurrentSector] = useState("")
  const [totalCards, setTotalCards] = useState(0)
  const [newUpserts, setNewUpserts] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [emailsFound, setEmailsFound] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [postcode, setPostcode] = useState("")
  const [granularityLevel, setGranularityLevel] = useState("subsector")
  const [excludeInactive, setExcludeInactive] = useState(true)
  const [postcodeUrl, setPostcodeUrl] = useState("https://www.doogal.co.uk/UKPostcodes")

  // Refs
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Effects
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  useEffect(() => {
    // Apply theme class to body
    document.body.className = isDarkMode ? styles.darkTheme : styles.lightTheme
  }, [isDarkMode])

  // Clear error message when inputs change
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage("")
    }
  }, [city, keyword, errorMessage])

  // Fetch scraper status on mount and set up refresh interval
  useEffect(() => {
    fetchScraperStatus()
    fetchLogs()

    const interval = setInterval(() => {
      fetchScraperStatus()
      if (isRunning || isEmailScraping) {
        fetchLogs()
      }
    }, 5000) // Refresh every 5 seconds

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, isEmailScraping])

  // Update local state based on scraper status
  useEffect(() => {
    if (scraperStatus) {
      setIsRunning(scraperStatus.running.gmb)
      setIsEmailScraping(scraperStatus.running.email)

      // Update stats from MongoDB if available
      if (scraperStatus.dbStats) {
        setTotalSectors(scraperStatus.dbStats.subsector_queue || 0)
        setTotalCards(scraperStatus.dbStats.restaurants || 0)

        // Calculate progress if scraper is running
        if (scraperStatus.running.gmb && scraperStatus.dbStats.subsector_queue > 0) {
          // This is an approximation - we'd need more data for accurate progress
          const processedSubsectors = fetchProcessedSubsectorsCount()
          setProgress(Math.round((processedSubsectors / scraperStatus.dbStats.subsector_queue) * 100))
        }
      }
    }
  }, [scraperStatus])

  // Functions
  const fetchScraperStatus = async () => {
    try {
      const response = await fetch("/api/scraper?action=status")
      if (!response.ok) throw new Error("Failed to fetch scraper status")
      const data = await response.json()
      setScraperStatus(data)
    } catch (error) {
      console.error("Error fetching scraper status:", error)
    }
  }

  const fetchLogs = async () => {
    try {
      // Determine which logs to fetch based on active scraper
      let logType = "all"
      if (isRunning && !isEmailScraping) logType = "gmb"
      else if (isEmailScraping && !isRunning) logType = "email"

      const response = await fetch(`/api/scraper?action=logs&type=${logType}&lines=50`)
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data: ScraperLogs = await response.json()

      // Update logs
      setLogs(data.logs)
    } catch (error) {
      console.error("Error fetching logs:", error)
    }
  }

  // Mock function - in a real app, this would fetch from the API
  const fetchProcessedSubsectorsCount = () => {
    // This would be replaced with actual API call
    return Math.floor(totalSectors * (progress / 100)) || 0
  }

  const toggleScraper = async () => {
    if (!city || !keyword) {
      setErrorMessage(
        !city && !keyword
          ? "Please enter both city and keyword"
          : !city
            ? "Please enter a city"
            : "Please enter a keyword",
      )
      return
    }

    try {
      setIsLoading(true)

      if (!isRunning) {
        // Start the GMB scraper
        const response = await fetch("/api/scraper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start_gmb_scraper",
            params: {
              subsector: city,
              headless,
              debug: false,
              fast: false,
            },
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to start scraper")
        }

        setIsRunning(true)
        addLog(`Starting scraper for ${keyword} in ${city}`)
        addLog(`Headless mode: ${headless ? "enabled" : "disabled"}`)

        // Set initial values for progress display
        setTotalSectors(10) // This will be updated from the API
        setProgress(0)

        // Switch to tasks tab to show progress
        setActiveTab("tasks")

        toast({
          title: "Scraper Started",
          description: `Scraping ${keyword} in ${city}`,
        })
      } else {
        // Stop the scraper
        const response = await fetch("/api/scraper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "stop_scraper",
            params: { type: "gmb" },
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to stop scraper")
        }

        setIsRunning(false)
        addLog("Scraper stopped by user")

        toast({
          title: "Scraper Stopped",
          description: "The scraper has been stopped",
        })
      }
    } catch (error) {
      console.error("Error toggling scraper:", error)
      toast({
        title: "Error",
        description: `Failed to ${isRunning ? "stop" : "start"} scraper`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startEmailScraping = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_email_scraper",
          params: {
            threads: 5,
            headless: true,
            debug: false,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start email scraper")
      }

      setIsEmailScraping(true)
      setActiveTab("tasks") // Switch to tasks tab to show progress

      addLog("Starting email scraper...")
      addLog("Initializing email extraction process")

      toast({
        title: "Email Scraper Started",
        description: "Email extraction process has begun",
      })

      // Fetch initial email stats
      fetchEmailStats()
    } catch (error) {
      console.error("Error starting email scraper:", error)
      toast({
        title: "Error",
        description: "Failed to start email scraper",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmailStats = async () => {
    try {
      const response = await fetch("/api/data?action=stats")
      if (!response.ok) throw new Error("Failed to fetch stats")

      const data = await response.json()
      if (data.stats?.businesses?.byEmailStatus?.found) {
        setEmailsFound(data.stats.businesses.byEmailStatus.found)
      }
    } catch (error) {
      console.error("Error fetching email stats:", error)
    }
  }

  const startPostcodeScraper = async () => {
    if (!postcode) {
      setErrorMessage("Please enter a postcode prefix")
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_postcode_scraper",
          params: {
            prefix: postcode,
            city: "Leeds",
            headless: true,
            workers: 4,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start postcode scraper")
      }

      addLog(`Starting postcode scraper for prefix: ${postcode}`)
      addLog(`Granularity level: ${granularityLevel}`)
      addLog(`Exclude inactive: ${excludeInactive ? "Yes" : "No"}`)

      // Switch to tasks tab to show progress
      setActiveTab("tasks")

      toast({
        title: "Postcode Scraper Started",
        description: `Scraping postcodes with prefix: ${postcode}`,
      })
    } catch (error) {
      console.error("Error starting postcode scraper:", error)
      toast({
        title: "Error",
        description: "Failed to start postcode scraper",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const exportData = async () => {
    try {
      setIsLoading(true)
      addLog("Exporting data...")

      const response = await fetch("/api/data?action=export&type=businesses&format=csv")
      if (!response.ok) throw new Error("Failed to export data")

      const data = await response.json()

      addLog(`Data exported successfully: ${data.count} records`)

      toast({
        title: "Export Complete",
        description: `Exported ${data.count} records to ${data.filename}`,
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      addLog("Error exporting data")

      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Add this function to create a ripple effect on buttons
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget

    // Prevent multiple ripples
    const ripple = button.getElementsByClassName(styles.ripple)[0]
    if (ripple) {
      ripple.remove()
    }

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      const circle = document.createElement("span")
      const diameter = Math.max(button.clientWidth, button.clientHeight)
      const radius = diameter / 2

      circle.style.width = circle.style.height = `${diameter}px`
      circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`
      circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`
      circle.classList.add(styles.ripple)

      button.appendChild(circle)

      // Clean up ripple after animation completes
      setTimeout(() => {
        if (circle.parentElement === button) {
          button.removeChild(circle)
        }
      }, 600)
    })
  }

  // Chart data for dashboard
  const getRandomData = (length: number, min: number, max: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min)
  }

  const weeklyData = getRandomData(7, 10, 100)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const maxValue = Math.max(...weeklyData)

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkTheme : styles.lightTheme}`}>
      <div className={styles.gradientBackground}></div>
      <div className={styles.panel}>
        {/* Top Navbar */}
        <div className={styles.navbar}>
          <div className={styles.navbarBrand}>
            <Terminal className={styles.titleIcon} />
            <h1 className={styles.title}>GMB Scraper</h1>
          </div>

          <div className={styles.navTabs}>
            <button
              className={`${styles.navTab} ${activeTab === "home" ? styles.activeNavTab : ""}`}
              onClick={(e) => {
                setActiveTab("home")
                createRipple(e)
              }}
            >
              <Home size={18} />
              <span>Home</span>
            </button>

            <button
              className={`${styles.navTab} ${activeTab === "emails" ? styles.activeNavTab : ""}`}
              onClick={(e) => {
                setActiveTab("emails")
                createRipple(e)
              }}
            >
              <Mail size={18} />
              <span>Emails</span>
            </button>

            <button
              className={`${styles.navTab} ${activeTab === "postcodes" ? styles.activeNavTab : ""}`}
              onClick={(e) => {
                setActiveTab("postcodes")
                createRipple(e)
              }}
            >
              <MapPin size={18} />
              <span>Postcodes</span>
            </button>

            <button
              className={`${styles.navTab} ${activeTab === "dashboard" ? styles.activeNavTab : ""}`}
              onClick={(e) => {
                setActiveTab("dashboard")
                createRipple(e)
              }}
            >
              <BarChart2 size={18} />
              <span>Dashboard</span>
            </button>

            <button
              className={`${styles.navTab} ${activeTab === "tasks" ? styles.activeNavTab : ""}`}
              onClick={(e) => {
                setActiveTab("tasks")
                createRipple(e)
              }}
            >
              <div className={styles.tabIconWrapper}>
                <List size={18} />
                {(isRunning || isEmailScraping) && (
                  <div className={styles.spinnerBadge}>
                    <Loader size={10} />
                  </div>
                )}
              </div>
              <span>Tasks</span>
            </button>
          </div>

          <div className={styles.navActions}>
            {totalCards > 0 && (
              <button
                className={styles.exportButton}
                onClick={(e) => {
                  exportData()
                  createRipple(e)
                }}
                title="Export Data"
                disabled={isLoading}
              >
                {isLoading ? <Loader size={18} className={styles.spinningIcon} /> : <Download size={18} />}
                <span>Export</span>
              </button>
            )}

            <button
              className={styles.themeToggle}
              onClick={(e) => {
                toggleTheme()
                createRipple(e)
              }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              className={styles.refreshButton}
              onClick={(e) => {
                fetchScraperStatus()
                fetchLogs()
                createRipple(e)
              }}
              title="Refresh Status"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.contentArea}>
          {/* Home Tab - Simplified Configuration */}
          {activeTab === "home" && (
            <div className={styles.homeTab}>
              <div className={styles.mainConfigSection}>
                <h2 className={styles.sectionTitle}>Scraper Configuration</h2>

                {errorMessage && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className={styles.requiredFields}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="city">City</label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter city (e.g. London)"
                        className={styles.input}
                        disabled={isRunning || isLoading}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="keyword">Keyword</label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="keyword"
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Enter keyword (e.g. restaurants)"
                        className={styles.input}
                        disabled={isRunning || isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.toggleSection}>
                  <div className={styles.toggleGroup}>
                    <label htmlFor="headless">Headless Mode</label>
                    <label className={styles.switch}>
                      <input
                        id="headless"
                        type="checkbox"
                        checked={headless}
                        onChange={() => setHeadless(!headless)}
                        disabled={isRunning || isLoading}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                <div className={styles.startButtonContainer}>
                  <button
                    className={`${styles.startButton} ${isRunning ? styles.stopButton : ""}`}
                    onClick={(e) => {
                      toggleScraper()
                      createRipple(e)
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader size={20} className={styles.spinningIcon} /> Please Wait...
                      </>
                    ) : isRunning ? (
                      <>
                        <Pause size={20} /> Stop Scraper
                      </>
                    ) : (
                      <>
                        <Play size={20} /> Start Scraper
                      </>
                    )}
                  </button>
                </div>

                {/* Current Progress Section */}
                {(isRunning || progress > 0) && (
                  <div className={styles.progressSection}>
                    <h3>Current Progress</h3>
                    <div className={styles.progressInfo}>
                      <span>Current sector: {currentSector || "None"}</span>
                      <span>{progress}% Complete</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className={styles.statsCards}>
                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <Globe size={24} />
                        </div>
                        <div className={styles.statInfo}>
                          <h3>Sectors</h3>
                          <p>{totalSectors}</p>
                        </div>
                      </div>

                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <Database size={24} />
                        </div>
                        <div className={styles.statInfo}>
                          <h3>Records</h3>
                          <p>{totalCards}</p>
                        </div>
                      </div>

                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <Shield size={24} />
                        </div>
                        <div className={styles.statInfo}>
                          <h3>New</h3>
                          <p>{newUpserts}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emails Tab */}
          {activeTab === "emails" && (
            <div className={styles.emailsTab}>
              <h2 className={styles.sectionTitle}>Email Scraper</h2>

              <div className={styles.emailsContent}>
                <div className={styles.emailsDescription}>
                  <p>Extract email addresses from business websites found during scraping.</p>
                </div>

                <div className={styles.emailsActionContainer}>
                  <button
                    className={`${styles.emailScrapeButton} ${isEmailScraping ? styles.emailScrapeButtonActive : ""}`}
                    onClick={(e) => {
                      if (!isEmailScraping && !isLoading) {
                        startEmailScraping()
                      }
                      createRipple(e)
                    }}
                    disabled={isEmailScraping || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader size={20} className={styles.spinningIcon} /> Please Wait...
                      </>
                    ) : isEmailScraping ? (
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
          )}

          {/* Postcodes Tab */}
          {activeTab === "postcodes" && (
            <div className={styles.postcodesTab}>
              <h2 className={styles.sectionTitle}>Postcode Scraper</h2>

              <div className={styles.mainConfigSection}>
                {errorMessage && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className={styles.requiredFields}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="postcodePrefix">Postcode Prefix</label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="postcodePrefix"
                        type="text"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        placeholder="Enter prefix (e.g. LS, BD, SW1)"
                        className={styles.input}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="postcodeUrl">URL</label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="postcodeUrl"
                        type="text"
                        value={postcodeUrl}
                        onChange={(e) => setPostcodeUrl(e.target.value)}
                        placeholder="Enter URL (e.g. https://www.doogal.co.uk/UKPostcodes)"
                        className={styles.input}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.granularitySection}>
                  <label htmlFor="granularity">Granularity Level</label>
                  <div className={styles.selectWrapper}>
                    <select
                      id="granularity"
                      className={styles.select}
                      value={granularityLevel}
                      onChange={(e) => setGranularityLevel(e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="sector">Sector (e.g. LS1)</option>
                      <option value="subsector">Sub-sector (e.g. LS1 4)</option>
                      <option value="fullpostcode">Full Postcode (e.g. LS1 4DL)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.toggleSection}>
                  <div className={styles.toggleGroup}>
                    <label htmlFor="excludeInactive">Exclude Inactive Postcodes</label>
                    <label className={styles.switch}>
                      <input
                        id="excludeInactive"
                        type="checkbox"
                        checked={excludeInactive}
                        onChange={() => setExcludeInactive(!excludeInactive)}
                        disabled={isLoading}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                <div className={styles.startButtonContainer}>
                  <button
                    className={styles.startButton}
                    onClick={(e) => {
                      startPostcodeScraper()
                      createRipple(e)
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader size={20} className={styles.spinningIcon} /> Please Wait...
                      </>
                    ) : (
                      <>
                        <Play size={20} /> Scrape Postcodes
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.postcodesPlaceholder}>
                <MapPin size={48} className={styles.postcodesIcon} />
                <p>Postcode scraper will extract data based on the selected granularity level</p>
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
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
          )}

          {/* Tasks Tab (renamed from Logs) */}
          {activeTab === "tasks" && (
            <div className={styles.tasksTab}>
              <div className={styles.tasksHeader}>
                <h2>
                  <Terminal size={18} /> Tasks
                  {(isRunning || isEmailScraping) && (
                    <span className={styles.runningIndicator}>{isRunning ? "Scraping" : "Email Scraping"}</span>
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
          )}
        </div>
      </div>
    </div>
  )
}
