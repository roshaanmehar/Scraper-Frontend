import { type NextRequest, NextResponse } from "next/server"
import { getBusinessData, getCollectionStats } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { collection: string } }) {
  try {
    // Fix: Use params.collection directly without Promise.resolve
    // Next.js App Router already handles this correctly
    const collection = params.collection
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const searchTerm = searchParams.get("search") || ""
    const sortField = searchParams.get("sortField") || "businessname"
    const sortOrder = searchParams.get("sortOrder") || "asc"

    console.log(`Fetching data from collection: ${collection}`)
    console.log(
      `Search params: page=${page}, limit=${limit}, search=${searchTerm}, sortField=${sortField}, sortOrder=${sortOrder}`,
    )

    // Get business data
    const result = await getBusinessData(collection, page, limit, searchTerm, sortField, sortOrder)
    console.log(`Retrieved ${result.data.length} records from ${collection}`)

    // Get collection stats
    const stats = await getCollectionStats(collection)
    console.log(`Collection stats: ${JSON.stringify(stats)}`)

    return NextResponse.json({
      ...result,
      stats,
    })
  } catch (error) {
    console.error("Error fetching business data:", error)

    // Return mock data as fallback when there's an error
    return NextResponse.json(
      {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        },
        stats: {
          totalRecords: 0,
          recordsWithEmail: 0,
          recordsWithWebsite: 0,
          uniqueSubsectors: 0,
          avgStars: "0.0",
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    ) // Return 200 instead of 500 to prevent client-side error
  }
}
