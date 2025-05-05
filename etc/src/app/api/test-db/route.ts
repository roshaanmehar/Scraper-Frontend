import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

export async function GET() {
  try {
    // Connection URL
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
    console.log(`Testing MongoDB connection to: ${MONGODB_URI}`)

    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI)
    console.log("Connected to MongoDB successfully")

    // Get list of all databases
    const adminDb = client.db("admin")
    const dbs = await adminDb.admin().listDatabases()
    const dbNames = dbs.databases.map((db: any) => db.name)
    console.log(`Available databases: ${JSON.stringify(dbNames)}`)

    // Check if Leeds database exists
    const leedsExists = dbNames.includes("Leeds")
    console.log(`Leeds database exists: ${leedsExists}`)

    let collections = []
    let restaurantsExists = false
    let restaurantsCount = 0
    let sampleDocument = null

    if (leedsExists) {
      // Get Leeds database
      const db = client.db("Leeds")

      // Get all collections in Leeds
      const collectionsList = await db.listCollections().toArray()
      collections = collectionsList.map((col) => col.name)
      console.log(`Collections in Leeds: ${JSON.stringify(collections)}`)

      // Check if restaurants collection exists
      restaurantsExists = collections.includes("restaurants")
      console.log(`Restaurants collection exists: ${restaurantsExists}`)

      if (restaurantsExists) {
        // Count documents in restaurants
        const collection = db.collection("restaurants")
        restaurantsCount = await collection.countDocuments()
        console.log(`Documents in restaurants: ${restaurantsCount}`)

        // Get a sample document
        if (restaurantsCount > 0) {
          sampleDocument = await collection.findOne()
          console.log(`Sample document: ${JSON.stringify(sampleDocument)}`)
        }
      }
    }

    // Close the connection
    await client.close()

    // Return the results
    return NextResponse.json({
      connection: "success",
      databases: dbNames,
      leedsExists,
      collections,
      restaurantsExists,
      restaurantsCount,
      sampleDocument,
    })
  } catch (error) {
    console.error("Error testing database connection:", error)

    return NextResponse.json(
      {
        connection: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
