// Scraper types
export interface ScraperConfig {
  city: string
  keyword: string
  headless: boolean
}

export interface ScraperProgress {
  progress: number
  currentSector: string
  totalSectors: number
  totalCards: number
  newUpserts: number
}

// Email scraper types
export interface EmailScraperResult {
  emailsFound: number
  websites: number
  validEmails: number
}

// Postcode scraper types
export interface PostcodeScraperConfig {
  prefix: string
  city: string
  granularity: "sector" | "subsector" | "full"
}

export interface PostcodeScraperResult {
  totalPostcodes: number
  sectors: number
  subsectors: number
}
