import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

// Get MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = "Leeds"

// Create a MongoDB client
let client: MongoClient | null = null

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
  }
  return client
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const collection = searchParams.get("collection")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const skip = Number.parseInt(searchParams.get("skip") || "0")
    const subsector = searchParams.get("subsector")
    const emailStatus = searchParams.get("emailStatus")

    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          message: "Collection parameter is required",
        },
        { status: 400 },
      )
    }

    // Connect to MongoDB
    const client = await getMongoClient()
    const db = client.db(DB_NAME)

    // Build query
    const query: Record<string, any> = {}
    if (subsector) query.subsector = subsector
    if (emailStatus) query.emailstatus = emailStatus

    // Get data
    const data = await db.collection(collection).find(query).skip(skip).limit(limit).toArray()

    // Get total count
    const total = await db.collection(collection).countDocuments(query)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error("Error in data API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, collection, data, query } = await request.json()

    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          message: "Collection parameter is required",
        },
        { status: 400 },
      )
    }

    // Connect to MongoDB
    const client = await getMongoClient()
    const db = client.db(DB_NAME)

    // Handle different actions
    switch (action) {
      case "insert":
        if (!data) {
          return NextResponse.json(
            {
              success: false,
              message: "Data is required for insert action",
            },
            { status: 400 },
          )
        }

        const insertResult = Array.isArray(data)
          ? await db.collection(collection).insertMany(data)
          : await db.collection(collection).insertOne(data)

        return NextResponse.json({
          success: true,
          result: insertResult,
        })

      case "update":
        if (!query || !data) {
          return NextResponse.json(
            {
              success: false,
              message: "Query and data are required for update action",
            },
            { status: 400 },
          )
        }

        // Convert string _id to ObjectId if present
        if (query._id && typeof query._id === "string") {
          query._id = new ObjectId(query._id)
        }

        const updateResult = await db.collection(collection).updateOne(query, { $set: data })

        return NextResponse.json({
          success: true,
          result: updateResult,
        })

      case "delete":
        if (!query) {
          return NextResponse.json(
            {
              success: false,
              message: "Query is required for delete action",
            },
            { status: 400 },
          )
        }

        // Convert string _id to ObjectId if present
        if (query._id && typeof query._id === "string") {
          query._id = new ObjectId(query._id)
        }

        const deleteResult = await db.collection(collection).deleteOne(query)

        return NextResponse.json({
          success: true,
          result: deleteResult,
        })

      case "stats":
        // Get collection statistics
        const stats = {
          subsector_queue: {
            total: await db.collection("subsector_queue").countDocuments(),
            processed: await db.collection("subsector_queue").countDocuments({ scrapedsuccessfully: true }),
            pending: await db.collection("subsector_queue").countDocuments({ scrapedsuccessfully: false }),
          },
          restaurants: {
            total: await db.collection("restaurants").countDocuments(),
            withWebsite: await db.collection("restaurants").countDocuments({
              website: { $exists: true, $ne: "N/A" },
            }),
            withEmail: await db.collection("restaurants").countDocuments({
              emailstatus: "found",
            }),
            pendingEmail: await db.collection("restaurants").countDocuments({
              emailstatus: "pending",
            }),
          },
        }

        return NextResponse.json({
          success: true,
          stats,
        })

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unknown action: ${action}`,
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Error in data API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
