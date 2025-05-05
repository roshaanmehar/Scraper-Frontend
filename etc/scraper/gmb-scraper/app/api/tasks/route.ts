import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function GET() {
  try {
    // Connect to MongoDB
    const client = new MongoClient(MONGO_URI)
    await client.connect()

    // Get tasks from database
    const db = client.db("scraper_tasks")
    const tasksCollection = db.collection("tasks")

    const tasks = await tasksCollection.find({}).sort({ startTime: -1 }).limit(20).toArray()

    // Close MongoDB connection
    await client.close()

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error getting tasks:", error)
    return NextResponse.json({ error: "Failed to get tasks" }, { status: 500 })
  }
}
