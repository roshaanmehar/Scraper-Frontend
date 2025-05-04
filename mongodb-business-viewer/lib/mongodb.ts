import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const MONGODB_DB = process.env.MONGODB_DB || "scraper_db"

// Check if we're in production
const isProd = process.env.NODE_ENV === "production"

let cachedClient: MongoClient | null = null
let cachedDb: any = null

export async function connectToDatabase() {
  try {
    // If we have a cached connection, use it
    if (cachedClient && cachedDb) {
      return { client: cachedClient, db: cachedDb }
    }

    console.log("Connecting to MongoDB:", MONGODB_URI)

    // Create a new MongoDB client
    const client = new MongoClient(MONGODB_URI)

    // Connect to the MongoDB server
    await client.connect()
    console.log("Connected to MongoDB successfully")

    // Get the database
    const db = client.db(MONGODB_DB)

    // Cache the client and db for reuse
    cachedClient = client
    cachedDb = db

    return { client, db }
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw error
  }
}

export async function getCollections() {
  try {
    const { db } = await connectToDatabase()
    const collections = await db.listCollections().toArray()

    // Filter out the subsector_queue collection
    return collections
      .filter((collection: any) => collection.name !== "subsector_queue")
      .map((collection: any) => collection.name)
  } catch (error) {
    console.error("Error getting collections:", error)
    return []
  }
}

export async function getBusinessData(collectionName: string, page = 1, limit = 50, searchTerm = "") {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection(collectionName)

    // Create search query - make it more lenient
    const query: any = {}

    // Add search term if provided
    if (searchTerm) {
      query.$or = [
        { businessname: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phonenumber: { $regex: searchTerm, $options: "i" } },
      ]
    }

    console.log("MongoDB Query:", JSON.stringify(query))

    // Get total count for pagination
    const total = await collection.countDocuments(query)
    console.log(`Total documents matching query: ${total}`)

    // Get paginated data
    const skip = (page - 1) * limit
    const data = await collection.find(query).sort({ scraped_at: -1 }).skip(skip).limit(limit).toArray()
    console.log(`Retrieved ${data.length} documents`)

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Error in getBusinessData:", error)
    // Return empty data instead of throwing
    return {
      data: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    }
  }
}

export async function getCollectionStats(collectionName: string) {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection(collectionName)

    // Get total records
    const totalRecords = await collection.countDocuments()

    // Get records with email
    const recordsWithEmail = await collection.countDocuments({
      email: { $exists: true, $ne: [] },
    })

    // Get records with website
    const recordsWithWebsite = await collection.countDocuments({
      website: { $exists: true, $ne: "" },
    })

    // Get unique subsectors
    const uniqueSubsectors = await collection.distinct("subsector")

    // Get average stars - handle potential errors
    let avgStars = "0.0"
    try {
      const starsAggregation = await collection
        .aggregate([
          { $match: { stars: { $exists: true, $ne: "" } } },
          { $group: { _id: null, avgStars: { $avg: { $toDouble: "$stars" } } } },
        ])
        .toArray()

      avgStars = starsAggregation.length > 0 ? starsAggregation[0].avgStars.toFixed(1) : "0.0"
    } catch (error) {
      console.error("Error calculating average stars:", error)
    }

    return {
      totalRecords,
      recordsWithEmail,
      recordsWithWebsite,
      uniqueSubsectors: uniqueSubsectors.length,
      avgStars,
    }
  } catch (error) {
    console.error("Error in getCollectionStats:", error)
    // Return default stats instead of throwing
    return {
      totalRecords: 0,
      recordsWithEmail: 0,
      recordsWithWebsite: 0,
      uniqueSubsectors: 0,
      avgStars: "0.0",
    }
  }
}
