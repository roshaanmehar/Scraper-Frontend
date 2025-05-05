import { type NextRequest, NextResponse } from "next/server"
import { getAllRestaurantsWithEmail } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""

    // Get all restaurants with email that match the search criteria
    const restaurants = await getAllRestaurantsWithEmail(search)

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ error: "No restaurants found with emails" }, { status: 404 })
    }

    // Convert to CSV
    const headers = [
      "Business Name",
      "Phone Number",
      "Address",
      "Email",
      "Website",
      "Rating",
      "Number of Reviews",
      "Subsector",
      "Date Scraped",
    ]

    let csvContent = headers.join(",") + "\n"

    restaurants.forEach((restaurant) => {
      const row = [
        // Escape quotes and commas in fields
        `"${(restaurant.businessname || "").replace(/"/g, '""')}"`,
        `"${restaurant.phonenumber || ""}"`,
        `"${(restaurant.address || "").replace(/"/g, '""')}"`,
        `"${(restaurant.email || []).join("; ").replace(/"/g, '""')}"`,
        `"${(restaurant.website || "").replace(/"/g, '""')}"`,
        `"${restaurant.stars || ""}"`,
        `"${restaurant.numberofreviews || ""}"`,
        `"${(restaurant.subsector || "").replace(/"/g, '""')}"`,
        `"${restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : ""}"`,
      ]

      csvContent += row.join(",") + "\n"
    })

    // Set headers for CSV download
    const headers_res = new Headers()
    headers_res.set("Content-Type", "text/csv")
    headers_res.set(
      "Content-Disposition",
      `attachment; filename="leeds_restaurants_${new Date().toISOString().split("T")[0]}.csv"`,
    )

    return new NextResponse(csvContent, {
      status: 200,
      headers: headers_res,
    })
  } catch (error) {
    console.error("Error exporting CSV:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
