import { MongoClient, type Db } from "mongodb"

// Connection URL
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
// Database Name - Force to use "Leeds"
const MONGODB_DB = "Leeds"

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`)

  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    console.log("Using cached database connection")
    return { client: cachedClient, db: cachedDb }
  }

  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI)
    console.log(`Using database: ${MONGODB_DB}`)
    const db = client.db(MONGODB_DB)

    // Cache the connection
    cachedClient = client
    cachedDb = db

    console.log("Connected to MongoDB successfully")
    return { client, db }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw error
  }
}

export async function getBusinessData(collectionName: string, page = 1, limit = 50, searchTerm = "") {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection(collectionName)

    // Build query
    const query: any = {}
    if (searchTerm) {
      query.$or = [
        { businessname: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phonenumber: { $regex: searchTerm, $options: "i" } },
      ]
    }

    console.log(`MongoDB Query: ${JSON.stringify(query)}`)

    // Get total count
    const total = await collection.countDocuments(query)
    console.log(`Total documents matching query: ${total}`)

    // Calculate pagination
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)

    // Get data
    const data = await collection.find(query).sort({ businessname: 1 }).skip(skip).limit(limit).toArray()

    console.log(`Retrieved ${data.length} documents`)

    // Sample data for debugging
    if (data.length > 0) {
      console.log(`Sample document: ${JSON.stringify(data[0])}`)
    } else {
      // Check if collection exists and has documents
      const sampleData = await collection.find({}).limit(1).toArray()
      console.log(`Sample data from ${collectionName}: ${JSON.stringify(sampleData)}`)

      // Count total documents in collection
      const totalDocs = await collection.countDocuments({})
      console.log(`Total documents in ${collectionName}: ${totalDocs}`)
    }

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error in getBusinessData:", error)
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
    const totalRecords = await collection.countDocuments({})

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
        {
          $match: {
            stars: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: null,
            avgStars: { $avg: { $toDouble: "$stars" } },
          },
        },
      ])
      .toArray()

    const avgStars = starsAggregation.length > 0 ? starsAggregation[0].avgStars.toFixed(1) : "0.0"

    return {
      totalRecords,
      recordsWithEmail,
      recordsWithWebsite,
      uniqueSubsectors: uniqueSubsectors.length,
      avgStars,
    }
  } catch (error) {
    console.error("Error in getCollectionStats:", error)
    return {
      totalRecords: 0,
      recordsWithEmail: 0,
      recordsWithWebsite: 0,
      uniqueSubsectors: 0,
      avgStars: "0.0",
    }
  }
}

export async function getCollections() {
  try {
    const { db } = await connectToDatabase()
    console.log("Fetching collections from MongoDB")

    // Get all collections
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((collection) => collection.name)

    console.log(`Available collections: ${JSON.stringify(collectionNames)}`)

    // If restaurants is not in the list, add it
    if (!collectionNames.includes("restaurants")) {
      console.log("Adding 'restaurants' to collection list")
      collectionNames.push("restaurants")
    }

    console.log(`Collections retrieved: ${JSON.stringify(collectionNames)}`)
    return collectionNames
  } catch (error) {
    console.error("Error in getCollections:", error)
    return ["restaurants"]
  }
}
