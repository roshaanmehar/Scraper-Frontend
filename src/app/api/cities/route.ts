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

    // Ensure we have a text index on area_covered for faster searches
    try {
      await db.collection("cities").createIndex({ area_covered: "text" })
    } catch (error) {
      // Index might already exist, continue
      console.log("Index may already exist:", error)
    }

    // Create a case-insensitive regex for the search term
    const query = {
      area_covered: {
        $regex: search,
        $options: "i", // Case-insensitive
      },
    }

    // Fetch cities data with case-insensitive search
    const cities = await db
      .collection("cities")
      .find(query)
      .sort({ area_covered: 1 })
      .limit(10) // Limit to 10 results for performance
      .toArray()

    const endTime = performance.now()
    console.log(`Found ${cities.length} cities matching "${search}" in ${(endTime - startTime).toFixed(2)}ms`)

    return NextResponse.json(cities)
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json([], { status: 500 })
  }
}
