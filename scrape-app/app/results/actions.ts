"use server"

import { MongoClient } from "mongodb"

export type Restaurant = {
  _id: string
  businessname: string
  phonenumber?: number | string
  address?: string
  email?: string | string[]
  website?: string
  stars?: string
  numberofreviews?: number
  subsector?: string
  scraped_at?: Date | string | null
  emailstatus?: string
  emailscraped_at?: Date | string | null
}

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI as string
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function getRestaurants(page = 1, limit = 6) {
  try {
    console.log("Connecting to MongoDB...")
    const client = await clientPromise
    console.log("Connected to MongoDB")

    const db = client.db("Leeds") // Database name specified here

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    console.log(`Fetching restaurants with skip=${skip}, limit=${limit}`)

    // Get total count for pagination
    const totalCount = await db.collection("restaurants").countDocuments()
    console.log(`Total restaurants: ${totalCount}`)

    // Fetch restaurants with pagination
    const restaurants = await db
      .collection("restaurants")
      .find({})
      .sort({ scraped_at: -1 }) // Sort by most recently scraped
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log(`Fetched ${restaurants.length} restaurants from MongoDB`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = restaurants.map((restaurant) => ({
      ...restaurant,
      _id: restaurant._id.toString(),
      scraped_at: restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : null,
      emailscraped_at: restaurant.emailscraped_at ? new Date(restaurant.emailscraped_at).toISOString() : null,
    }))

    return {
      restaurants: serializedRestaurants as Restaurant[],
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    }
  } catch (error) {
    console.error("Error fetching restaurants from MongoDB:", error)
    return {
      restaurants: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: page,
        limit,
      },
    }
  }
}

export async function searchRestaurants(query: string, page = 1, limit = 6) {
  try {
    console.log(`Searching for "${query}" in MongoDB...`)
    const client = await clientPromise
    const db = client.db("Leeds") // Database name specified here

    // Create search filter
    const filter = {
      $or: [
        { businessname: { $regex: query, $options: "i" } },
        { address: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { subsector: { $regex: query, $options: "i" } },
      ],
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const totalCount = await db.collection("restaurants").countDocuments(filter)
    console.log(`Found ${totalCount} matching restaurants`)

    // Fetch restaurants with pagination
    const restaurants = await db
      .collection("restaurants")
      .find(filter)
      .sort({ scraped_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log(`Fetched ${restaurants.length} restaurants from search`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = restaurants.map((restaurant) => ({
      ...restaurant,
      _id: restaurant._id.toString(),
      scraped_at: restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : null,
      emailscraped_at: restaurant.emailscraped_at ? new Date(restaurant.emailscraped_at).toISOString() : null,
    }))

    return {
      restaurants: serializedRestaurants as Restaurant[],
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    }
  } catch (error) {
    console.error("Error searching restaurants in MongoDB:", error)
    return {
      restaurants: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: page,
        limit,
      },
    }
  }
}
