"use client"

import { useState } from "react"
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Search,
  Loader,
  Database,
  Shield,
  AlertCircle,
  Globe,
} from "lucide-react"
import { useRipple } from "@/hooks/useRipple"
import { useLogStore } from "@/stores/logStore"
import styles from "@/styles/tabs/PostcodesTab.module.css"

interface PostcodesTabProps {
  isPostcodeScraping: boolean
  setIsPostcodeScraping: (isPostcodeScraping: boolean) => void
  postcodeResults: {
    totalPostcodes: number
    sectors: number
    subsectors: number
  }
  setPostcodeResults: (postcodeResults: any) => void
  setActiveTab: (tab: string) => void
}

export default function PostcodesTab({
  isPostcodeScraping,
  setIsPostcodeScraping,
  postcodeResults,
  setPostcodeResults,
  setActiveTab,
}: PostcodesTabProps) {
  const { createRipple } = useRipple()
  const { addLog } = useLogStore()

  const [postcodePrefix, setPostcodePrefix] = useState("")
  const [postcodeCity, setPostcodeCity] = useState("")
  const [postcodeGranularity, setPostcodeGranularity] = useState("sector")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    })
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
    addLog("Setting up request headers...")
    addLog("Browser launched successfully")

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
        const sectorNum = Math.floor(Math.random() * 9) + 1
        addLog(`Discovered new sector: ${postcodePrefix}${sectorNum}`)

        // Simulate some actual postcodes
        if (Math.random() > 0.6) {
          const subsector = Math.floor(Math.random() * 9) + 1
          const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
          const letter1 = letters[Math.floor(Math.random() * letters.length)]
          const letter2 = letters[Math.floor(Math.random() * letters.length)]

          addLog(`Sample postcode: ${postcodePrefix}${sectorNum} ${subsector}${letter1}${letter2}`)
        }
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

  return (
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
          {errorMessage && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

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
  )
}
