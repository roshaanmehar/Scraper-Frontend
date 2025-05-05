// This script optimizes the cities collection for faster searching
// Run with: npx ts-node scripts/optimize-cities-collection.ts

import { MongoClient } from "mongodb"

async function optimizeCitiesCollection() {
  // Replace with your MongoDB connection string
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
  const MONGODB_DB = "cities" // Changed to match the user's database name

  console.log("Connecting to MongoDB...")
  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db(MONGODB_DB)

  try {
    // Check if cities collection exists
    const collections = await db.listCollections({ name: "cities" }).toArray()

    if (collections.length === 0) {
      console.log("Cities collection doesn't exist. Creating it...")
      await db.createCollection("cities")
    }

    // Create indexes for faster searches
    console.log("Creating indexes on cities collection...")

    // Index for exact matches
    await db.collection("cities").createIndex({ area_covered: 1 })

    // Text index for full-text search capabilities
    await db.collection("cities").createIndex({ area_covered: "text" })

    // Index for postcode area searches
    await db.collection("cities").createIndex({ postcode_area: 1 })

    // Compound index for area_covered and postcode_area
    await db.collection("cities").createIndex({ area_covered: 1, postcode_area: 1 })

    // Check if we need to convert any fields
    const sampleCity = await db.collection("cities").findOne({})
    console.log("Sample city:", sampleCity)

    if (sampleCity) {
      // If area_covered is not a string, convert it
      if (typeof sampleCity.area_covered !== "string") {
        console.log("Converting area_covered to string...")
        const cities = await db.collection("cities").find({}).toArray()

        for (const city of cities) {
          await db
            .collection("cities")
            .updateOne({ _id: city._id }, { $set: { area_covered: String(city.area_covered) } })
        }
      }

      // If postcode_area is not a string, convert it
      if (typeof sampleCity.postcode_area !== "string") {
        console.log("Converting postcode_area to string...")
        const cities = await db.collection("cities").find({}).toArray()

        for (const city of cities) {
          await db
            .collection("cities")
            .updateOne({ _id: city._id }, { $set: { postcode_area: String(city.postcode_area) } })
        }
      }
    }

    // Count cities
    const cityCount = await db.collection("cities").countDocuments()
    console.log(`Cities collection has ${cityCount} documents`)

    // Create a lowercase version of area_covered for case-insensitive searches
    console.log("Creating lowercase version of area_covered for faster case-insensitive searches...")
    await db
      .collection("cities")
      .updateMany({ area_covered_lower: { $exists: false } }, [
        { $set: { area_covered_lower: { $toLower: "$area_covered" } } },
      ])

    // Create index on lowercase field
    await db.collection("cities").createIndex({ area_covered_lower: 1 })

    console.log("Optimization complete!")
  } catch (error) {
    console.error("Error optimizing cities collection:", error)
  } finally {
    await client.close()
    console.log("MongoDB connection closed")
  }
}

optimizeCitiesCollection().catch(console.error)
