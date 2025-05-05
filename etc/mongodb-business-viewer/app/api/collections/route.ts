import { NextResponse } from "next/server"
import { getCollections } from "@/lib/mongodb"

export async function GET() {
  try {
    const collections = await getCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    console.error("Error fetching collections:", error)
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 })
  }
}
