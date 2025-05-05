import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
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

    if (task.status !== "running") {
      await client.close()
      return NextResponse.json({ error: "Task is not running" }, { status: 400 })
    }

    // Update task status
    await tasksCollection.updateOne(
      { _id: taskId },
      {
        $set: {
          status: "cancelled",
          endTime: new Date(),
        },
      },
    )

    // In a real implementation, you would kill the process
    // This is a simplified example
    // You would need to store the process ID in the database
    // and then use it to kill the process
    // exec(`kill ${task.processId}`)

    // Close MongoDB connection
    await client.close()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling task:", error)
    return NextResponse.json({ error: "Failed to cancel task" }, { status: 500 })
  }
}
