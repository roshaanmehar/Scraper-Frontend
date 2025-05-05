import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""

    if (!search || search.length < 2) {
      return NextResponse.json({
        status: "success",
        cities: [],
      })
    }

    const { db } = await connectToDatabase()

    // Create a query to search for cities
    const query = {
      area_covered: { $regex: search, $options: "i" },
    }

    console.log(`Searching cities with query:`, query)

    // Get the cities collection
    const cities = await db.collection("cities").find(query).limit(10).toArray()

    console.log(`Found ${cities.length} cities matching "${search}"`)

    return NextResponse.json({
      status: "success",
      cities,
    })
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to fetch cities",
      },
      { status: 500 },
    )
  }
}
