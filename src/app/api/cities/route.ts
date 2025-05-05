import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const citiesCollection = db.collection("cities")

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    // Build the query
    const query = search ? { area_covered: { $regex: search, $options: "i" } } : {}

    // Fetch cities data
    const cities = await citiesCollection.find(query).sort({ area_covered: 1 }).limit(50).toArray()

    console.log(`Found ${cities.length} cities matching "${search}"`)

    return NextResponse.json({
      cities,
      status: "success",
    })
  } catch (error) {
    console.error("Error fetching cities data:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch cities data",
        status: "error",
      },
      { status: 500 },
    )
  }
}
