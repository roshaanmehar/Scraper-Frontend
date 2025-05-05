import { NextResponse } from "next/server"
import { getCollections } from "../../../lib/mongodb"

export async function GET() {
  try {
    const collections = await getCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    console.error("Error in collections API route:", error)
    return NextResponse.json(
      {
        collections: ["restaurants"],
        error: error.message || "Failed to fetch collections",
      },
      { status: 200 }, // Return 200 to avoid client errors
    )
  }
}
