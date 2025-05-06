import { type NextRequest, NextResponse } from "next/server"
import { searchRestaurants } from "@/app/results/actions"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query") || ""
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const sort = searchParams.get("sort") || "recent"

  try {
    console.log(`Search API: Searching for "${query}" (page ${page}, sort ${sort})`)

    // Check if query might be a phone number
    if (/\d/.test(query)) {
      console.log(`Search API: Query contains digits, might be a phone number search`)
    }

    const results = await searchRestaurants(query, page)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in search API:", error)
    return NextResponse.json({ error: "Failed to search restaurants" }, { status: 500 })
  }
}
