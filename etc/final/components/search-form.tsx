"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./search-form.module.css"

export default function SearchForm({ initialSearch = "" }) {
  const [search, setSearch] = useState(initialSearch)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/results?search=${encodeURIComponent(search)}`)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.searchForm}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by business name, email, or phone number"
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchButton}>
        Search
      </button>
    </form>
  )
}
