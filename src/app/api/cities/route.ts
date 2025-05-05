import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

// Improve the caching mechanism
const cityCache = new Map<string, any[]>()
const CACHE_EXPIRY = 1000 * 60 * 30 // Increase to 30 minutes for better performance

// Add a prefetch cache for popular cities
const POPULAR_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Liverpool",
  "Newcastle",
  "Edinburgh",
  "Glasgow",
  "Cardiff",
  "Belfast",
  "Lincoln",
]
const popularCitiesCache: Record<string, any[]> = {}

// Prefetch popular cities on module initialization
async function prefetchPopularCities() {
  try {
    const { db } = await connectToDatabase()

    for (const city of POPULAR_CITIES) {
      const lowercaseCity = city.toLowerCase()
      const results = await db
        .collection("cities")
        .find({
          area_covered: {
            $regex: `^${city}`,
            $options: "i",
          },
        })
        .sort({ area_covered: 1 })
        .limit(10)
        .toArray()

      popularCitiesCache[lowercaseCity] = results

      // Also cache partial matches (first 3+ characters)
      if (city.length > 3) {
        for (let i = 3; i < city.length; i++) {
          const partial = city.substring(0, i).toLowerCase()
          popularCitiesCache[partial] = results
        }
      }
    }
    console.log("Prefetched popular cities for faster search")
  } catch (error) {
    console.error("Error prefetching popular cities:", error)
  }
}

// Call prefetch on module initialization
prefetchPopularCities()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const lowercaseSearch = search.toLowerCase()

    if (!search || search.trim().length < 1) {
      return NextResponse.json([])
    }

    console.log(`Searching for cities with term: "${search}"`)
    const startTime = performance.now()

    // Check if it's a popular city (exact or partial match)
    if (popularCitiesCache[lowercaseSearch]) {
      console.log(`Using prefetched popular city cache for "${search}"`)
      return NextResponse.json(popularCitiesCache[lowercaseSearch])
    }

    // Check regular cache
    const cacheKey = lowercaseSearch
    if (cityCache.has(cacheKey)) {
      const cachedResult = cityCache.get(cacheKey)
      console.log(`Using cached result for "${search}" with ${cachedResult?.length || 0} cities`)
      return NextResponse.json(cachedResult)
    }

    const { db } = await connectToDatabase()

    // Ensure we have an index on area_covered for faster searches
    try {
      await db.collection("cities").createIndex({ area_covered: 1 })
      await db.collection("cities").createIndex({ area_covered: "text" })
    } catch (error) {
      // Index might already exist, continue
      console.log("Index may already exist:", error)
    }

    // First try a prefix search for faster results (starts with)
    const prefixQuery = {
      area_covered: {
        $regex: `^${search}`,
        $options: "i", // Case-insensitive
      },
    }

    let cities = await db.collection("cities").find(prefixQuery).sort({ area_covered: 1 }).limit(10).toArray()

    // If no results with prefix search, try a contains search
    if (cities.length === 0) {
      const containsQuery = {
        area_covered: {
          $regex: search,
          $options: "i", // Case-insensitive
        },
      }

      cities = await db.collection("cities").find(containsQuery).sort({ area_covered: 1 }).limit(10).toArray()
    }

    const endTime = performance.now()
    console.log(`Found ${cities.length} cities matching "${search}" in ${(endTime - startTime).toFixed(2)}ms`)

    // Cache the results for future requests
    cityCache.set(cacheKey, cities)

    // Set cache expiry
    setTimeout(() => {
      cityCache.delete(cacheKey)
    }, CACHE_EXPIRY)

    return NextResponse.json(cities)
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json([], { status: 500 })
  }
}
