import { MongoClient, type Db } from "mongodb"

// Connection URL
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
// Database Name - Use "Leeds" as the database name
const MONGODB_DB = "Leeds"

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db(MONGODB_DB)
    return { client, db }
  } catch (e: any) {
    console.error(e)
    throw new Error("Could not connect to MongoDB")
  }
}

export async function getBusinessData(
  collectionName: string,
  page: number,
  limit: number,
  searchTerm: string,
  sortField: string,
  sortOrder: string,
) {
  try {
    const { db } = await connectToDatabase()
    const skip = (page - 1) * limit

    let sort: { [key: string]: 1 | -1 } = { businessname: 1 } // Default sort
    if (sortField) {
      sort = { [sortField]: sortOrder === "asc" ? 1 : -1 }
    }

    const query = searchTerm ? { businessname: { $regex: searchTerm, $options: "i" } } : {}

    const data = await db.collection(collectionName).find(query).sort(sort).skip(skip).limit(limit).toArray()

    const total = await db.collection(collectionName).countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    return {
      data: JSON.parse(JSON.stringify(data)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (e: any) {
    console.error("Could not fetch business data", e)
    return {
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: limit,
        totalPages: 0,
      },
    }
  }
}

export async function getCollectionStats(collectionName: string) {
  try {
    const { db } = await connectToDatabase()

    const totalRecords = await db.collection(collectionName).countDocuments()
    const recordsWithEmail = await db
      .collection(collectionName)
      .countDocuments({ email: { $exists: true, $ne: null, $ne: "" } })
    const recordsWithWebsite = await db
      .collection(collectionName)
      .countDocuments({ website: { $exists: true, $ne: null, $ne: "" } })

    // Get unique subsectors
    const uniqueSubsectorsResult = await db.collection(collectionName).distinct("subsector")
    const uniqueSubsectors = uniqueSubsectorsResult.length

    // Calculate average stars
    const avgStarsResult = await db
      .collection(collectionName)
      .aggregate([{ $group: { _id: null, avgStars: { $avg: "$stars" } } }])
      .toArray()

    const avgStars = avgStarsResult.length > 0 ? avgStarsResult[0].avgStars.toFixed(1) : "0.0"

    return {
      totalRecords,
      recordsWithEmail,
      recordsWithWebsite,
      uniqueSubsectors,
      avgStars,
    }
  } catch (e: any) {
    console.error("Could not fetch collection stats", e)
    return {
      totalRecords: 0,
      recordsWithEmail: 0,
      recordsWithWebsite: 0,
      uniqueSubsectors: 0,
      avgStars: "0.0",
    }
  }
}
