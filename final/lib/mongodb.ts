import { MongoClient } from "mongodb"
import type { Restaurant, RestaurantQueryParams } from "./types"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const ITEMS_PER_PAGE = 12

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!global._mongoClientPromise) {
  client = new MongoClient(MONGODB_URI)
  global._mongoClientPromise = client.connect()
}

clientPromise = global._mongoClientPromise

export async function getRestaurants({
  search = "",
  sortBy = "businessname",
  sortOrder = "asc",
  page = 1,
}: RestaurantQueryParams) {
  const client = await clientPromise
  const db = client.db("Leeds")
  const collection = db.collection("restaurants")

  // Build query
  const query: any = {
    email: { $exists: true, $ne: [] }, // Only include restaurants with emails
  }

  if (search) {
    // Search by business name, email, or phone number
    const phoneSearch = !isNaN(Number(search)) ? Number(search) : null

    query.$or = [{ businessname: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]

    if (phoneSearch !== null) {
      query.$or.push({ phonenumber: phoneSearch })
    }
  }

  // Count total matching documents for pagination
  const totalCount = await collection.countDocuments(query)
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Sort options
  const sortOptions: any = {}
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1

  // Fetch paginated results
  const restaurants = (await collection
    .find(query)
    .sort(sortOptions)
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .toArray()) as Restaurant[]

  return {
    restaurants,
    totalPages,
    currentPage: page,
  }
}

export async function getAllRestaurantsWithEmail(search = "") {
  const client = await clientPromise
  const db = client.db("Leeds")
  const collection = db.collection("restaurants")

  // Build query
  const query: any = {
    email: { $exists: true, $ne: [] }, // Only include restaurants with emails
  }

  if (search) {
    // Search by business name, email, or phone number
    const phoneSearch = !isNaN(Number(search)) ? Number(search) : null

    query.$or = [{ businessname: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]

    if (phoneSearch !== null) {
      query.$or.push({ phonenumber: phoneSearch })
    }
  }

  // Fetch all matching results
  const restaurants = (await collection.find(query).toArray()) as Restaurant[]

  return restaurants
}
