"use server"

import { MongoClient } from "mongodb"

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI
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

export type Restaurant = {
  _id: string
  businessname: string
  phonenumber: number
  address: string
  email: string[]
  website: string
  stars: string
  numberofreviews: number
  subsector: string
  scraped_at: Date
  emailstatus: string
  emailscraped_at: Date
}

export async function getRestaurants(page = 1, limit = 6) {
  try {
    const client = await clientPromise
    const db = client.db("Leeds") // Database name specified here, not in env

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const totalCount = await db.collection("restaurants").countDocuments()

    // Fetch restaurants with pagination
    const restaurants = await db
      .collection("restaurants")
      .find({})
      .sort({ scraped_at: -1 }) // Sort by most recently scraped
      .skip(skip)
      .limit(limit)
      .toArray()

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
    console.error("Error fetching restaurants:", error)
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
    const client = await clientPromise
    const db = client.db("Leeds") // Database name specified here, not in env

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

    // Fetch restaurants with pagination
    const restaurants = await db
      .collection("restaurants")
      .find(filter)
      .sort({ scraped_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

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
    console.error("Error searching restaurants:", error)
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
