import { type NextRequest, NextResponse } from "next/server"
import { processCity } from "@/lib/scriptOrchestrator"

// Simple in-memory store for tracking active jobs
const activeJobs: Record<string, boolean> = {}

export async function POST(req: NextRequest) {
  try {
    const { city } = await req.json()

    if (!city) {
      return NextResponse.json({ error: "City name is required" }, { status: 400 })
    }

    const cityLower = city.toLowerCase()

    // Check if there's already an active job for this city
    if (activeJobs[cityLower]) {
      return NextResponse.json({
        message: `A scraping job is already running for ${city}`,
        inProgress: true,
      })
    }

    // Mark this city as having an active job
    activeJobs[cityLower] = true

    // Get MongoDB URI from environment variables
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

    // Start the process asynchronously
    processCity(cityLower, MONGODB_URI)
      .then((result) => {
        console.log(`Scraping job for ${city} completed:`, result)
        // Remove from active jobs when done
        delete activeJobs[cityLower]
      })
      .catch((error) => {
        console.error(`Error in scraping job for ${city}:`, error)
        // Remove from active jobs on error
        delete activeJobs[cityLower]
      })

    return NextResponse.json({
      success: true,
      message: `Scraping job started for ${city}`,
      inProgress: true,
    })
  } catch (error) {
    console.error("Error in scrape API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Endpoint to check if a city is being scraped
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const city = url.searchParams.get("city")

  if (!city) {
    return NextResponse.json({ error: "City parameter is required" }, { status: 400 })
  }

  const cityLower = city.toLowerCase()

  return NextResponse.json({
    city: cityLower,
    inProgress: !!activeJobs[cityLower],
  })
}
