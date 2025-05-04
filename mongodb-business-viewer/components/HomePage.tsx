"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, AlertCircle } from 'lucide-react'
import AppLayout from "@/components/layout/AppLayout"
import styles from "@/styles/HomePage.module.css"

export default function HomePage() {
  const router = useRouter()
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [headless, setHeadless] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Clear error message when inputs change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    setter(e.target.value)
    if (errorMessage) {
      setErrorMessage("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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

    setIsLoading(true)

    // Simulate API call/processing
    setTimeout(() => {
      // Navigate to results page
      router.push("/results")
    }, 1500)
  }

  // Create ripple effect on buttons
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const button = event.currentTarget;
      if (!button) return;
      
      const circle = document.createElement("span");
      const diameter = Math.max(button.clientWidth || 0, button.clientHeight || 0);
      const radius = diameter / 2;

      // Get button position
      const rect = button.getBoundingClientRect();

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - rect.left - radius}px`;
      circle.style.top = `${event.clientY - rect.top - radius}px`;
      circle.classList.add("ripple");

      // Remove existing ripples
      const ripple = button.getElementsByClassName("ripple")[0];
      if (ripple) {
        ripple.remove();
      }

      button.appendChild(circle);

      // Remove ripple after animation
      setTimeout(() => {
        if (circle && circle.parentElement) {
          circle.remove();
        }
      }, 600);
    } catch (error) {
      console.error("Ripple effect error:", error);
    }
  };

  return (
    <AppLayout activeTab="home">
      <div className={styles.homeContainer}>
        <div className={styles.mainConfigSection}>
          <h2 className={styles.sectionTitle}>Scraper Configuration</h2>

          {errorMessage && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.requiredFields}>
              <div className={styles.inputGroup}>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => handleInputChange(e, setCity)}
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
                  onChange={(e) => handleInputChange(e, setKeyword)}
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
                type="submit"
                className={`${styles.startButton} ${isLoading ? styles.loadingButton : ""}`}
                onClick={(e) => createRipple(e)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.loadingSpinner}></span> Processing...
                  </>
                ) : (
                  <>
                    <Play size={20} /> Start Scraper
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.infoSection}>
          <h3>How It Works</h3>
          <p>
            This tool helps you scrape business information from Google My Business listings based on your search
            criteria. Simply enter a city and keyword to get started.
          </p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h4>Configure Search</h4>
                <p>Enter a city and keyword to define your search parameters.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h4>Run Scraper</h4>
                <p>Our system will search for and collect business information matching your criteria.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h4>View Results</h4>
                <p>Review the collected data in an organized format on the Results page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
