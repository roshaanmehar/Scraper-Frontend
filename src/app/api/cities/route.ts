import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase, cityCache, popularCitiesCache } from "@/lib/mongodb"

// Cache expiry time
const CACHE_EXPIRY = 1000 * 60 * 30 // 30 minutes

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

    try {
      const { db } = await connectToDatabase()

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
    } catch (dbError) {
      console.error("Database error when searching cities:", dbError)

      // Return empty results instead of throwing an error
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("Error in cities API route:", error)

    // Return empty results with 200 status to prevent client-side errors
    return NextResponse.json([], { status: 200 })
  }
}
