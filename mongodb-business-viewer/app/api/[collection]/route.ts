import { type NextRequest, NextResponse } from "next/server"
import { getBusinessData, getCollectionStats } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { collection: string } }) {
  try {
    const { collection } = params
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const searchTerm = searchParams.get("search") || ""

    // Get business data
    const result = await getBusinessData(collection, page, limit, searchTerm)

    // Get collection stats
    const stats = await getCollectionStats(collection)

    return NextResponse.json({
      ...result,
      stats,
    })
  } catch (error) {
    console.error("Error fetching business data:", error)
    return NextResponse.json({ error: "Failed to fetch business data" }, { status: 500 })
  }
}
