import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""

    if (!search || search.length < 2) {
      return NextResponse.json([])
    }

    const { db } = await connectToDatabase()

    // Create a case-insensitive regex for the search term
    const searchRegex = new RegExp(search, "i")

    // Query the cities collection
    const cities = await db
      .collection("cities")
      .find({
        area_covered: { $regex: searchRegex },
      })
      .limit(10)
      .toArray()

    return NextResponse.json(cities)
  } catch (error) {
    console.error("Error fetching cities:", error)
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 })
  }
}
