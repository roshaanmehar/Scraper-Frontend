import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const MONGODB_DB = process.env.MONGODB_DB || "scraper_db"

// Check if we're in production
const isProd = process.env.NODE_ENV === "production"

let cachedClient: MongoClient | null = null
let cachedDb: any = null

export async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  // Create a new MongoDB client
  const client = new MongoClient(MONGODB_URI)

  // Connect to the MongoDB server
  await client.connect()

  // Get the database
  const db = client.db(MONGODB_DB)

  // Cache the client and db for reuse
  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollections() {
  const { db } = await connectToDatabase()
  const collections = await db.listCollections().toArray()

  // Filter out the subsector_queue collection
  return collections
    .filter((collection: any) => collection.name !== "subsector_queue")
    .map((collection: any) => collection.name)
}

export async function getBusinessData(collectionName: string, page = 1, limit = 50, searchTerm = "") {
  const { db } = await connectToDatabase()
  const collection = db.collection(collectionName)

  // Create search query - only include records with email
  const query: any = {
    email: { $exists: true, $ne: [] }, // Only get records with emails
  }

  // Add search term if provided
  if (searchTerm) {
    query.$or = [
      { businessname: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
      { phonenumber: { $regex: searchTerm, $options: "i" } },
    ]
  }

  // Get total count for pagination
  const total = await collection.countDocuments(query)

  // Get paginated data
  const skip = (page - 1) * limit
  const data = await collection.find(query).sort({ scraped_at: -1 }).skip(skip).limit(limit).toArray()

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getCollectionStats(collectionName: string) {
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

  // Get average stars
  const starsAggregation = await collection
    .aggregate([
      { $match: { stars: { $exists: true, $ne: "" } } },
      { $group: { _id: null, avgStars: { $avg: { $toDouble: "$stars" } } } },
    ])
    .toArray()

  const avgStars = starsAggregation.length > 0 ? starsAggregation[0].avgStars : 0

  return {
    totalRecords,
    recordsWithEmail,
    recordsWithWebsite,
    uniqueSubsectors: uniqueSubsectors.length,
    avgStars: avgStars.toFixed(1),
  }
}
