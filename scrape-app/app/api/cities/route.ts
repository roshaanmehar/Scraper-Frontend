import { type NextRequest, NextResponse } from "next/server"
import { searchCities } from "../../actions"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query") || ""

  try {
    const cities = await searchCities(query)
    return NextResponse.json({ cities })
  } catch (error) {
    console.error("Error in cities API:", error)
    return NextResponse.json({ error: "Failed to search cities" }, { status: 500 })
  }
}
