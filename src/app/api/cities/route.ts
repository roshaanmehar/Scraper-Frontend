import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""

    if (!search || search.trim().length < 1) {
      return NextResponse.json([])
    }

    console.log(`Searching for cities with term: "${search}"`)
    const startTime = performance.now()

    const { db } = await connectToDatabase()

    // Log the collection name and count to verify we're looking in the right place
    const collectionName = "cities"
    const totalCities = await db.collection(collectionName).countDocuments({})
    console.log(`Total documents in ${collectionName} collection: ${totalCities}`)

    // Log a sample document to verify structure
    const sampleCity = await db.collection(collectionName).findOne({})
    console.log(`Sample city document:`, JSON.stringify(sampleCity, null, 2))

    // Create a case-insensitive regex for the search term
    const query = {
      area_covered: {
        $regex: search,
        $options: "i", // Case-insensitive
      },
    }

    console.log(`Search query:`, JSON.stringify(query))

    // Fetch cities data with case-insensitive search
    const cities = await db
      .collection(collectionName)
      .find(query)
      .sort({ area_covered: 1 })
      .limit(10) // Limit to 10 results for performance
      .toArray()

    const endTime = performance.now()
    console.log(`Found ${cities.length} cities matching "${search}" in ${(endTime - startTime).toFixed(2)}ms`)

    if (cities.length === 0) {
      // If no results, try a more flexible search
      console.log("No results with exact search, trying more flexible search")

      const flexibleQuery = {
        area_covered: {
          $regex: `.*${search}.*`,
          $options: "i", // Case-insensitive
        },
      }

      const flexibleCities = await db
        .collection(collectionName)
        .find(flexibleQuery)
        .sort({ area_covered: 1 })
        .limit(10)
        .toArray()

      console.log(`Found ${flexibleCities.length} cities with flexible search`)

      if (flexibleCities.length > 0) {
        return NextResponse.json(flexibleCities)
      }

      // If still no results, try searching for exact match ignoring case
      const exactCities = await db
        .collection(collectionName)
        .find({ area_covered: { $regex: `^${search}$`, $options: "i" } })
        .toArray()

      console.log(`Found ${exactCities.length} cities with exact case-insensitive match`)

      if (exactCities.length > 0) {
        return NextResponse.json(exactCities)
      }
    }

    return NextResponse.json(cities)
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json([], { status: 500 })
  }
}
