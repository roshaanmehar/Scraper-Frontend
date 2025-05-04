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

    // Sample data for debugging
    if (data.length > 0) {
      console.log(`Sample document: ${JSON.stringify(data[0])}`)
      // Check if the sample document has a valid email
      const sampleEmail = data[0].email
      console.log(`Sample email: ${JSON.stringify(sampleEmail)}`)
      if (Array.isArray(sampleEmail)) {
        console.log(`Email is array with ${sampleEmail.length} items`)
      } else {
        console.log(`Email is ${typeof sampleEmail}: ${sampleEmail}`)
      }
    } else {
      // Check if collection exists and has documents
      const totalDocs = await collection.countDocuments({})
      console.log(`Total documents in ${collectionName}: ${totalDocs}`)

      // Count documents with email field
      const docsWithEmailField = await collection.countDocuments({ email: { $exists: true } })
      console.log(`Documents with email field in ${collectionName}: ${docsWithEmailField}`)

      // Count documents with non-empty email arrays
      const docsWithNonEmptyEmailArray = await collection.countDocuments({
        email: { $type: "array", $ne: [] },
      })
      console.log(`Documents with non-empty email arrays: ${docsWithNonEmptyEmailArray}`)

      // Count documents with non-empty email strings
      const docsWithNonEmptyEmailString = await collection.countDocuments({
        email: { $type: "string", $ne: "", $ne: "N/A" },
      })
      console.log(`Documents with non-empty email strings: ${docsWithNonEmptyEmailString}`)
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
