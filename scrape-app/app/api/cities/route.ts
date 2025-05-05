import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Define City type directly in this file to avoid import issues
type City = {
  _id: string
  postcode_area: string
  area_covered: string
  population_2011: number
  households_2011: number
  postcodes: number
  active_postcodes: number
  non_geographic_postcodes: number
  scraped_at: string
}

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI as string
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// In-memory cache for city searches
const cityCache = new Map<string, { cities: City[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour cache TTL

// Search cities function
async function searchCities(query: string): Promise<City[]> {
  // Normalize query for consistent caching
  const normalizedQuery = query.trim().toLowerCase()

  // Return early if query is too short
  if (normalizedQuery.length < 2) {
    return []
  }

  // Check cache first
  const cacheKey = `city:${normalizedQuery}`
  const cachedResult = cityCache.get(cacheKey)
  const now = Date.now()

  if (cachedResult && now - cachedResult.timestamp < CACHE_TTL) {
    console.log(`Cache hit for "${normalizedQuery}"`)
    return cachedResult.cities
  }

  console.log(`Cache miss for "${normalizedQuery}", fetching from MongoDB...`)

  try {
    const client = await clientPromise
    console.log("Connected to MongoDB")

    // Log available databases for debugging
    const adminDb = client.db("admin")
    const dbs = await adminDb.admin().listDatabases()
    console.log(
      "Available databases:",
      dbs.databases.map((db) => db.name),
    )

    // Try to connect to the Leeds database
    const db = client.db("Leeds")

    // Log available collections for debugging
    const collections = await db.listCollections().toArray()
    console.log(
      "Available collections in Leeds database:",
      collections.map((c) => c.name),
    )

    // Create search filter for city names - search in the cities collection
    const filter = {
      area_covered: { $regex: normalizedQuery, $options: "i" },
    }

    console.log(`Searching for cities matching "${normalizedQuery}"`)

    // Get matching cities, limit to 10 for performance
    // Use the correct collection name based on your MongoDB structure
    const cities = await db.collection("cities").find(filter).limit(10).toArray()

    console.log(`Found ${cities.length} cities matching "${normalizedQuery}"`)

    // Convert MongoDB documents to plain objects
    const serializedCities = cities.map((city) => ({
      ...city,
      _id: city._id.toString(),
    }))

    // Store in cache
    cityCache.set(cacheKey, {
      cities: serializedCities as City[],
      timestamp: now,
    })

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) {
      // 10% chance to clean up on each request
      cleanupCache()
    }

    return serializedCities as City[]
  } catch (error) {
    console.error("Error searching cities in MongoDB:", error)
    return []
  }
}

// Helper function to clean up expired cache entries
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of cityCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cityCache.delete(key)
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query") || ""

  try {
    console.log(`API route received search request for "${query}"`)
    const cities = await searchCities(query)
    console.log(`API route returning ${cities.length} cities`)
    return NextResponse.json({ cities })
  } catch (error) {
    console.error("Error in cities API:", error)
    return NextResponse.json({ error: "Failed to search cities" }, { status: 500 })
  }
}
