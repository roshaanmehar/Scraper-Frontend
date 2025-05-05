import { MongoClient, type Db } from "mongodb"

// Connection URL
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
// Database Name - Use "cities" as the database name (matching the user's actual DB name)
const MONGODB_DB = "cities"

// Global caches for city search
export const cityCache = new Map<string, any[]>()
export const popularCitiesCache: Record<string, any[]> = {}

// Popular cities to prefetch
const POPULAR_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Liverpool",
  "Newcastle",
  "Edinburgh",
  "Glasgow",
  "Cardiff",
  "Belfast",
  "Lincoln",
]

// Connection caching
let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null
let isOptimized = false

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  try {
    console.log(`Connecting to MongoDB: ${MONGODB_URI}`)

    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI)
    const db = client.db(MONGODB_DB)

    // Cache the connection
    cachedClient = client
    cachedDb = db

    console.log(`Connected to MongoDB database: ${MONGODB_DB}`)

    // Run optimization in the background
    optimizeDatabaseInBackground(db).catch((err) => {
      console.error("Background optimization error:", err)
    })

    return { client, db }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw new Error("Could not connect to MongoDB")
  }
}

// Optimize database in the background without blocking
async function optimizeDatabaseInBackground(db: Db) {
  // Only run once per application session
  if (isOptimized) return

  try {
    console.log("Starting background database optimization...")

    // Check if cities collection exists
    const collections = await db.listCollections({ name: "cities" }).toArray()

    if (collections.length === 0) {
      console.warn("Warning: 'cities' collection does not exist in the database")
      return
    }

    // Create indexes for faster searches (if they don't exist)
    try {
      await db.collection("cities").createIndex({ area_covered: 1 })
      await db.collection("cities").createIndex({ area_covered: "text" })
      await db.collection("cities").createIndex({ postcode_area: 1 })
      console.log("Created indexes for faster city searches")
    } catch (error) {
      console.log("Indexes may already exist:", error)
    }

    // Prefetch popular cities
    await prefetchPopularCities(db)

    isOptimized = true
    console.log("Database optimization completed successfully")
  } catch (error) {
    console.error("Error during database optimization:", error)
  }
}

// Prefetch popular cities for faster searches
async function prefetchPopularCities(db: Db) {
  try {
    console.log("Prefetching popular cities...")

    for (const city of POPULAR_CITIES) {
      const lowercaseCity = city.toLowerCase()
      const results = await db
        .collection("cities")
        .find({
          area_covered: {
            $regex: `^${city}`,
            $options: "i",
          },
        })
        .sort({ area_covered: 1 })
        .limit(10)
        .toArray()

      popularCitiesCache[lowercaseCity] = results

      // Also cache partial matches (first 3+ characters)
      if (city.length > 3) {
        for (let i = 3; i < city.length; i++) {
          const partial = city.substring(0, i).toLowerCase()
          popularCitiesCache[partial] = results
        }
      }
    }

    console.log(`Prefetched ${POPULAR_CITIES.length} popular cities for faster search`)
  } catch (error) {
    console.error("Error prefetching popular cities:", error)
  }
}

export async function getBusinessData(
  collectionName: string,
  page = 1,
  limit = 50,
  searchTerm = "",
  sortField = "businessname",
  sortOrder = "asc",
) {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection(collectionName)

    // Build query - ONLY include records with valid emails
    // This complex query ensures we only get records with actual email values
    const query: any = {
      $and: [
        { email: { $exists: true } }, // Email field must exist
        {
          $or: [
            // For array emails, must have at least one non-empty value
            { $and: [{ email: { $type: "array" } }, { email: { $ne: [] } }] },
            // For string emails, must be non-empty and not "N/A"
            { $and: [{ email: { $type: "string" } }, { email: { $ne: "" } }, { email: { $ne: "N/A" } }] },
          ],
        },
      ],
    }

    // Add search term if provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { businessname: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ],
      })

      // Handle phone number search - could be stored as string or number
      if (!isNaN(Number(searchTerm))) {
        // If it's a number, search both string and number representations
        query.$and[query.$and.length - 1].$or.push({ phonenumber: { $regex: searchTerm, $options: "i" } })
        query.$and[query.$and.length - 1].$or.push({ phonenumber: Number(searchTerm) })
      } else {
        // If it's not a number, just search as string
        query.$and[query.$and.length - 1].$or.push({ phonenumber: { $regex: searchTerm, $options: "i" } })
      }
    }

    console.log(`MongoDB Query: ${JSON.stringify(query)}`)

    // Determine sort direction
    const sortDirection = sortOrder === "asc" ? 1 : -1

    // Create sort object
    const sort: any = {}
    sort[sortField] = sortDirection

    console.log(`Sorting by ${sortField} in ${sortOrder} order`)

    // Get total count
    const total = await collection.countDocuments(query)
    console.log(`Total documents matching query: ${total}`)

    // Calculate pagination
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)

    // Get data with sorting
    const data = await collection.find(query).sort(sort).skip(skip).limit(limit).toArray()

    console.log(`Retrieved ${data.length} documents`)

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

    // Get records with valid email (not empty, not "N/A")
    const recordsWithEmail = await collection.countDocuments({
      $and: [
        { email: { $exists: true } },
        {
          $or: [
            { $and: [{ email: { $type: "array" } }, { email: { $ne: [] } }] },
            { $and: [{ email: { $type: "string" } }, { email: { $ne: "" } }, { email: { $ne: "N/A" } }] },
          ],
        },
      ],
    })

    // Get records with website
    const recordsWithWebsite = await collection.countDocuments({
      website: { $exists: true, $ne: "", $ne: "N/A" },
    })

    // Get unique subsectors
    const uniqueSubsectors = await collection.distinct("subsector")

    // Get average stars - FIX: Only include numeric stars and handle conversion errors
    const starsAggregation = await collection
      .aggregate([
        {
          $match: {
            stars: {
              $exists: true,
              $ne: "",
              $ne: "N/A",
              // Only include records where stars can be converted to a number
              $regex: /^[0-9]+(\.[0-9]+)?$/,
            },
          },
        },
        {
          $group: {
            _id: null,
            avgStars: {
              $avg: {
                $convert: {
                  input: "$stars",
                  to: "double",
                  onError: 0, // Return 0 if conversion fails
                  onNull: 0, // Return 0 if value is null
                },
              },
            },
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
