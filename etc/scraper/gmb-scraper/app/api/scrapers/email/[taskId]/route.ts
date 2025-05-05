import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function GET(request: Request, { params }: { params: { taskId: string } }) {
  try {
    const taskId = params.taskId

    // Connect to MongoDB
    const client = new MongoClient(MONGO_URI)
    await client.connect()

    // Get task from database
    const db = client.db("scraper_tasks")
    const tasksCollection = db.collection("tasks")

    const task = await tasksCollection.findOne({ _id: taskId })

    if (!task) {
      await client.close()
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Close MongoDB connection
    await client.close()

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error getting email scraper status:", error)
    return NextResponse.json({ error: "Failed to get email scraper status" }, { status: 500 })
  }
}
