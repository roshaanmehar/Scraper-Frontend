import { NextResponse } from "next/server"
import { getCollections } from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("Fetching collections from MongoDB")
    const collections = await getCollections()
    console.log("Collections retrieved:", collections)
    return NextResponse.json({ collections })
  } catch (error) {
    console.error("Error fetching collections:", error)
    // Return restaurants as fallback
    return NextResponse.json({ collections: ["restaurants"] }, { status: 200 })
  }
}
