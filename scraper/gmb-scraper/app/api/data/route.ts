import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"
import fs from "fs"
import path from "path"

// MongoDB connection
let client: MongoClient | null = null

async function getMongoClient() {
  if (!client) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
    client = new MongoClient(uri)
    await client.connect()
  }
  return client
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    switch (action) {
      case "businesses":
        return await getBusinesses(searchParams)
      case "subsectors":
        return await getSubsectors(searchParams)
      case "stats":
        return await getStats()
      case "export":
        return await exportData(searchParams)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in GET handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, params } = body

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    switch (action) {
      case "reset_email_status":
        return await resetEmailStatus()
      case "update_business":
        return await updateBusiness(params)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getBusinesses(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get("page") || "1")
  const limit = Number.parseInt(searchParams.get("limit") || "20")
  const subsector = searchParams.get("subsector")
  const emailStatus = searchParams.get("emailStatus")
  const search = searchParams.get("search")

  // Validate pagination parameters
  const validPage = Math.max(1, page)
  const validLimit = Math.min(Math.max(1, limit), 100) // Limit between 1 and 100

  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")
    const collection = db.collection("restaurants")

    // Build query
    const query: any = {}

    if (subsector) {
      query.subsector = subsector
    }

    if (emailStatus) {
      query.emailstatus = emailStatus
    }

    if (search) {
      query.$or = [{ businessname: { $regex: search, $options: "i" } }, { address: { $regex: search, $options: "i" } }]

      // If search looks like a phone number, also search by phone
      if (/^\d+$/.test(search)) {
        query.$or.push({ phonenumber: Number.parseInt(search) })
      }
    }

    // Get total count for pagination
    const total = await collection.countDocuments(query)

    // Get paginated results
    const businesses = await collection
      .find(query)
      .sort({ businessname: 1 })
      .skip((validPage - 1) * validLimit)
      .limit(validLimit)
      .toArray()

    return NextResponse.json({
      businesses,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit),
      },
    })
  } catch (error) {
    console.error("Error getting businesses:", error)
    return NextResponse.json({ error: "Failed to retrieve businesses" }, { status: 500 })
  }
}

async function getSubsectors(searchParams: URLSearchParams) {
  const status = searchParams.get("status") // 'all', 'completed', 'pending'

  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")
    const collection = db.collection("subsector_queue")

    // Build query
    const query: any = {}

    if (status === "completed") {
      query.scrapedsuccessfully = true
    } else if (status === "pending") {
      query.scrapedsuccessfully = false
    }

    // Get subsectors
    const subsectors = await collection.find(query).sort({ subsector: 1 }).toArray()

    return NextResponse.json({ subsectors })
  } catch (error) {
    console.error("Error getting subsectors:", error)
    return NextResponse.json({ error: "Failed to retrieve subsectors" }, { status: 500 })
  }
}

async function getStats() {
  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")

    // Get collection stats
    const subsectorStats = await db
      .collection("subsector_queue")
      .aggregate([
        {
          $group: {
            _id: "$scrapedsuccessfully",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const businessStats = await db
      .collection("restaurants")
      .aggregate([
        {
          $group: {
            _id: "$emailstatus",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    // Format stats
    const stats = {
      subsectors: {
        total: subsectorStats.reduce((acc, curr) => acc + curr.count, 0),
        completed: subsectorStats.find((s) => s._id === true)?.count || 0,
        pending: subsectorStats.find((s) => s._id === false)?.count || 0,
      },
      businesses: {
        total: businessStats.reduce((acc, curr) => acc + curr.count, 0),
        byEmailStatus: Object.fromEntries(businessStats.map((s) => [s._id || "unknown", s.count])),
      },
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error getting stats:", error)
    return NextResponse.json({ error: "Failed to retrieve stats" }, { status: 500 })
  }
}

async function exportData(searchParams: URLSearchParams) {
  const type = searchParams.get("type") // 'businesses', 'subsectors', 'emails'
  const format = searchParams.get("format") || "json" // 'json', 'csv'
  const subsector = searchParams.get("subsector")

  if (!type || !["businesses", "subsectors", "emails"].includes(type)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
  }

  if (!["json", "csv"].includes(format)) {
    return NextResponse.json({ error: "Invalid export format" }, { status: 400 })
  }

  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")

    let data
    let filename

    if (type === "businesses") {
      const query: any = {}
      if (subsector) query.subsector = subsector

      data = await db.collection("restaurants").find(query).toArray()
      filename = subsector ? `leeds_${subsector}_businesses` : "leeds_all_businesses"
    } else if (type === "subsectors") {
      data = await db.collection("subsector_queue").find({}).toArray()
      filename = "leeds_subsectors"
    } else if (type === "emails") {
      const query = { emailstatus: "found" }
      if (subsector) query["subsector" as keyof typeof query] = subsector

      data = await db
        .collection("restaurants")
        .find(query)
        .project({ businessname: 1, email: 1, website: 1, subsector: 1 })
        .toArray()

      filename = subsector ? `leeds_${subsector}_emails` : "leeds_all_emails"
    }

    // Create export directory if it doesn't exist
    const exportDir = path.join(process.cwd(), "exports")
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true })
    }

    const filePath = path.join(exportDir, `${filename}.${format}`)

    if (format === "json") {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } else {
      // Convert to CSV
      const { parse } = require("json2csv")
      const csv = parse(data)
      fs.writeFileSync(filePath, csv)
    }

    return NextResponse.json({
      success: true,
      message: `Data exported successfully to ${filePath}`,
      filename: `${filename}.${format}`,
      count: data.length,
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}

async function resetEmailStatus() {
  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")
    const collection = db.collection("restaurants")

    // Reset email status for businesses with websites
    const result = await collection.updateMany(
      { website: { $exists: true, $nin: ["", null, "N/A"] } },
      {
        $set: {
          emailstatus: "pending",
          email: [],
          social_profiles: {},
        },
        $unset: { emailscraped_at: "" },
      },
    )

    return NextResponse.json({
      success: true,
      message: `Email status reset for ${result.modifiedCount} businesses`,
      count: result.modifiedCount,
    })
  } catch (error) {
    console.error("Error resetting email status:", error)
    return NextResponse.json({ error: "Failed to reset email status" }, { status: 500 })
  }
}

async function updateBusiness(params: any) {
  if (!params || !params.id) {
    return NextResponse.json({ error: "Missing business ID" }, { status: 400 })
  }

  try {
    const client = await getMongoClient()
    const db = client.db("Leeds")
    const collection = db.collection("restaurants")

    // Extract ID and remove it from update data
    const { id, ...updateData } = params

    // Update business
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Business updated successfully",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Error updating business:", error)
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 })
  }
}
