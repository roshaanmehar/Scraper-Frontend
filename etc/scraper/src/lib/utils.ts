import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Formats a number with commas for thousands
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/**
 * Generates random data for charts
 */
export function generateRandomData(length: number, min: number, max: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

/**
 * Validates a UK postcode format
 */
export function isValidUKPostcode(postcode: string): boolean {
  const re = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i
  return re.test(String(postcode).toUpperCase())
}

/**
 * Generate mock data for simulating scraping results
 */
export function generateMockBusinessData(count: number) {
  const categories = [
    "Restaurant",
    "Cafe",
    "Bar",
    "Hotel",
    "Retail",
    "Supermarket",
    "Gym",
    "Salon",
    "Dentist",
    "Mechanic",
  ]

  return Array.from({ length: count }, (_, i) => {
    const category = categories[Math.floor(Math.random() * categories.length)]
    return {
      id: `biz-${i + 1}`,
      name: `${category} Business ${i + 1}`,
      address: `${Math.floor(Math.random() * 200) + 1} Main Street, City`,
      phone: `+44 ${Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(10, "0")}`,
      website: `https://www.business${i + 1}.com`,
      email: Math.random() > 0.3 ? `info@business${i + 1}.com` : "",
      category,
    }
  })
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
