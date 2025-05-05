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
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Search,
} from "lucide-react"

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

  // Add these new state variables after the existing state declarations
  const [postcodePrefix, setPostcodePrefix] = useState("")
  const [postcodeCity, setPostcodeCity] = useState("")
  const [postcodeUrl, setPostcodeUrl] = useState("")
  const [postcodeGranularity, setPostcodeGranularity] = useState("sector")
  const [isPostcodeScraping, setIsPostcodeScraping] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [postcodeResults, setPostcodeResults] = useState<{
    totalPostcodes: number
    sectors: number
    subsectors: number
  }>({ totalPostcodes: 0, sectors: 0, subsectors: 0 })

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

  // Functions
  const toggleScraper = () => {
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

    setIsRunning(!isRunning)

    if (!isRunning) {
      // Simulate starting the scraper
      addLog(`Starting scraper for ${keyword} in ${city}`)
      addLog(`Headless mode: ${headless ? "enabled" : "disabled"}`)

      // Simulate scraping process
      setTotalSectors(10)
      simulateScraping()
    } else {
      // Simulate stopping the scraper
      addLog("Scraper stopped by user")
    }
  }

  const startEmailScraping = () => {
    setIsEmailScraping(true)
    setActiveTab("tasks") // Switch to tasks tab to show progress

    addLog("Starting email scraper...")
    addLog("Initializing email extraction process")

    // Simulate email scraping process
    let emailCount = 0
    const interval = setInterval(() => {
      const newEmails = Math.floor(Math.random() * 5) + 1
      emailCount += newEmails
      setEmailsFound(emailCount)

      addLog(`Found ${newEmails} new email${newEmails === 1 ? "" : "s"} (total: ${emailCount})`)

      if (emailCount >= 25 || Math.random() > 0.8) {
        clearInterval(interval)
        addLog("Email scraping completed successfully")
        setIsEmailScraping(false)
      }
    }, 2000)
  }

  const startPostcodeScraping = () => {
    if (!postcodePrefix || !postcodeCity) {
      setErrorMessage("Please enter both prefix and city name")
      return
    }

    setIsPostcodeScraping(true)
    setActiveTab("tasks") // Switch to tasks tab to show progress

    addLog(`Starting postcode scraper for prefix "${postcodePrefix}" in ${postcodeCity}...`)
    addLog(`Granularity level: ${postcodeGranularity}`)
    addLog("Initializing browser sessions...")

    // Simulate postcode scraping process
    let totalPostcodes = 0
    let sectors = 0
    let subsectors = 0
    let currentPage = 1

    const interval = setInterval(() => {
      const newPostcodes = Math.floor(Math.random() * 20) + 5
      totalPostcodes += newPostcodes

      if (Math.random() > 0.7) {
        sectors += 1
        subsectors += Math.floor(Math.random() * 3) + 1
      }

      addLog(`Page ${currentPage}: Found ${newPostcodes} postcodes`)

      if (Math.random() > 0.8) {
        addLog(`Discovered new sector: ${postcodePrefix}${Math.floor(Math.random() * 9) + 1}`)
      }

      setPostcodeResults({
        totalPostcodes,
        sectors,
        subsectors,
      })

      currentPage++

      if (currentPage > 10 || Math.random() > 0.9) {
        clearInterval(interval)
        addLog(`Postcode scraping completed successfully for ${postcodePrefix}`)
        addLog(`Total postcodes found: ${totalPostcodes}`)
        addLog(`Distinct sectors: ${sectors}`)
        addLog(`Distinct subsectors: ${subsectors}`)
        addLog(`Data saved to ${postcodePrefix}_postcodes.json and ${postcodePrefix}_stats.json`)
        setIsPostcodeScraping(false)
      }
    }, 2000)
  }

  const simulateScraping = () => {
    const sectors = [
      "RESTAURANTS",
      "CAFES",
      "BARS",
      "HOTELS",
      "RETAIL SHOPS",
      "SUPERMARKETS",
      "GYMS",
      "SALONS",
      "DENTISTS",
      "MECHANICS",
    ]
    let sectorIndex = 0
    let cards = 0
    let upserts = 0

    const interval = setInterval(() => {
      if (sectorIndex >= sectors.length || !isRunning) {
        clearInterval(interval)
        if (isRunning) {
          addLog("Scraping completed successfully")
          setIsRunning(false)
        }
        return
      }

      const currentSectorName = sectors[sectorIndex]
      setCurrentSector(currentSectorName)
      setProgress(Math.round(((sectorIndex + 1) / sectors.length) * 100))

      const sectorCards = Math.floor(Math.random() * 30) + 5
      cards += sectorCards
      const sectorUpserts = Math.floor(sectorCards * 0.7)
      upserts += sectorUpserts

      setTotalCards(cards)
      setNewUpserts(upserts)

      addLog(`▶ (${sectorIndex + 1}/${sectors.length}) ${currentSectorName}`)

      // Simulate some random events
      if (Math.random() > 0.7) {
        addLog(`Found ${sectorCards} businesses in ${currentSectorName}`)
      }

      if (Math.random() > 0.8) {
        addLog(`WARNING: Possible rate limiting detected, slowing down...`)
      }

      addLog(
        `✓ ${currentSectorName} - ${(Math.random() * 20 + 10).toFixed(1)}s cards=${sectorCards} new=${sectorUpserts}`,
      )

      sectorIndex++
    }, 3000)
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const exportData = () => {
    addLog("Exporting data...")
    // Simulate export delay
    setTimeout(() => {
      addLog("Data exported successfully")
    }, 1500)
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Add this function to create a ripple effect on buttons
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget

    const circle = document.createElement("span")
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`
    circle.classList.add(styles.ripple)

    const ripple = button.getElementsByClassName(styles.ripple)[0]
    if (ripple) {
      ripple.remove()
    }

    button.appendChild(circle)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
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
                {(isRunning || isEmailScraping || isPostcodeScraping) && (
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
              >
                <Download size={18} />
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
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter city (e.g. London)"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="keyword">Keyword</label>
                    <input
                      id="keyword"
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Enter keyword (e.g. restaurants)"
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.toggleSection}>
                  <div className={styles.toggleGroup}>
                    <label htmlFor="headless">Headless Mode</label>
                    <label className={styles.switch}>
                      <input id="headless" type="checkbox" checked={headless} onChange={() => setHeadless(!headless)} />
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
                  >
                    {isRunning ? (
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
          )}

          {/* Postcodes Tab */}
          {activeTab === "postcodes" && (
            <div className={styles.postcodesTab}>
              <h2 className={styles.sectionTitle}>Postcode Scraper</h2>

              <div className={styles.postcodesContent}>
                <div className={styles.postcodesInstructions}>
                  <h3>How to Use the Postcode Scraper</h3>
                  <ol className={styles.instructionsList}>
                    <li>
                      <span className={styles.instructionStep}>1</span>
                      <div>
                        <p>
                          Visit{" "}
                          <a
                            href="https://www.doogal.co.uk/UKPostcodes"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.instructionLink}
                          >
                            doogal.co.uk/UKPostcodes <ExternalLink size={14} />
                          </a>
                        </p>
                        <p className={styles.instructionDetail}>This website contains comprehensive UK postcode data</p>
                      </div>
                    </li>
                    <li>
                      <span className={styles.instructionStep}>2</span>
                      <div>
                        <p>Search for your target city or area</p>
                        <p className={styles.instructionDetail}>
                          Note the postcode prefix (e.g., LS for Leeds, M for Manchester)
                        </p>
                      </div>
                    </li>
                    <li>
                      <span className={styles.instructionStep}>3</span>
                      <div>
                        <p>Copy the URL from your search results</p>
                        <div className={styles.urlExample}>
                          <span>https://www.doogal.co.uk/UKPostcodes?Search=LS&page=1</span>
                          <button
                            className={styles.copyButton}
                            onClick={() => copyToClipboard("https://www.doogal.co.uk/UKPostcodes?Search=LS&page=1")}
                          >
                            {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </li>
                    <li>
                      <span className={styles.instructionStep}>4</span>
                      <div>
                        <p>Enter the prefix and city below, then start scraping</p>
                        <p className={styles.instructionDetail}>Results will appear in the Tasks tab</p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className={styles.postcodeForm}>
                  <div className={styles.postcodeInputs}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="postcodePrefix">Postcode Prefix</label>
                      <div className={styles.inputWithIcon}>
                        <MapPin size={18} className={styles.inputIcon} />
                        <input
                          id="postcodePrefix"
                          type="text"
                          value={postcodePrefix}
                          onChange={(e) => setPostcodePrefix(e.target.value.toUpperCase())}
                          placeholder="e.g. LS, M, SW1"
                          className={styles.input}
                          maxLength={4}
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="postcodeCity">City Name</label>
                      <div className={styles.inputWithIcon}>
                        <Globe size={18} className={styles.inputIcon} />
                        <input
                          id="postcodeCity"
                          type="text"
                          value={postcodeCity}
                          onChange={(e) => setPostcodeCity(e.target.value)}
                          placeholder="e.g. Leeds, Manchester"
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="postcodeGranularity">Granularity Level</label>
                      <div className={styles.dropdownContainer}>
                        <button
                          className={styles.dropdownButton}
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          type="button"
                        >
                          <span>
                            {postcodeGranularity === "sector" && "Sector (e.g., LS9)"}
                            {postcodeGranularity === "subsector" && "Sub-sector (e.g., LS9 9)"}
                            {postcodeGranularity === "full" && "Full Postcode (e.g., LS9 9AB)"}
                          </span>
                          <ChevronDown size={18} />
                        </button>
                        {isDropdownOpen && (
                          <div className={styles.dropdownMenu}>
                            <button
                              className={`${styles.dropdownItem} ${postcodeGranularity === "sector" ? styles.dropdownItemActive : ""}`}
                              onClick={() => {
                                setPostcodeGranularity("sector")
                                setIsDropdownOpen(false)
                              }}
                            >
                              Sector (e.g., LS9)
                            </button>
                            <button
                              className={`${styles.dropdownItem} ${postcodeGranularity === "subsector" ? styles.dropdownItemActive : ""}`}
                              onClick={() => {
                                setPostcodeGranularity("subsector")
                                setIsDropdownOpen(false)
                              }}
                            >
                              Sub-sector (e.g., LS9 9)
                            </button>
                            <button
                              className={`${styles.dropdownItem} ${postcodeGranularity === "full" ? styles.dropdownItemActive : ""}`}
                              onClick={() => {
                                setPostcodeGranularity("full")
                                setIsDropdownOpen(false)
                              }}
                            >
                              Full Postcode (e.g., LS9 9AB)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.postcodeActionContainer}>
                    <button
                      className={`${styles.postcodeScrapeButton} ${isPostcodeScraping ? styles.postcodeScrapeButtonActive : ""}`}
                      onClick={(e) => {
                        if (!isPostcodeScraping) {
                          startPostcodeScraping()
                        }
                        createRipple(e)
                      }}
                      disabled={isPostcodeScraping || !postcodePrefix || !postcodeCity}
                    >
                      {isPostcodeScraping ? (
                        <>
                          <Loader size={20} className={styles.spinningIcon} /> Scraping Postcodes...
                        </>
                      ) : (
                        <>
                          <Search size={20} /> Start Postcode Scraper
                        </>
                      )}
                    </button>
                  </div>

                  {postcodeResults.totalPostcodes > 0 && (
                    <div className={styles.postcodeResults}>
                      <div className={styles.postcodeResultsGrid}>
                        <div className={styles.postcodeResultCard}>
                          <div className={styles.postcodeResultIcon}>
                            <MapPin size={24} />
                          </div>
                          <div className={styles.postcodeResultInfo}>
                            <h3>Total Postcodes</h3>
                            <p>{postcodeResults.totalPostcodes}</p>
                          </div>
                        </div>

                        <div className={styles.postcodeResultCard}>
                          <div className={styles.postcodeResultIcon}>
                            <Database size={24} />
                          </div>
                          <div className={styles.postcodeResultInfo}>
                            <h3>Sectors</h3>
                            <p>{postcodeResults.sectors}</p>
                          </div>
                        </div>

                        <div className={styles.postcodeResultCard}>
                          <div className={styles.postcodeResultIcon}>
                            <Shield size={24} />
                          </div>
                          <div className={styles.postcodeResultInfo}>
                            <h3>Subsectors</h3>
                            <p>{postcodeResults.subsectors}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
          )}
        </div>
      </div>
    </div>
  )
}
