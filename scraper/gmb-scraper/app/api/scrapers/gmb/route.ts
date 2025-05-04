import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { exec } from "child_process"
import { v4 as uuidv4 } from "uuid"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function POST(request: Request) {
  try {
    const { city, keyword } = await request.json()

    if (!city || !keyword) {
      return NextResponse.json({ error: "City and keyword are required" }, { status: 400 })
    }

    // Generate a unique task ID
    const taskId = uuidv4()

    // Connect to MongoDB
    const client = new MongoClient(MONGO_URI)
    await client.connect()

    // Store task in database
    const db = client.db("scraper_tasks")
    const tasksCollection = db.collection("tasks")

    await tasksCollection.insertOne({
      _id: taskId,
      type: "gmb",
      status: "running",
      city,
      keyword,
      startTime: new Date(),
      progress: {
        current: 0,
        total: 0,
      },
    })

    // Execute the Python script
    // In a real implementation, you would use a task queue like Celery
    // This is a simplified example
    const pythonProcess = exec(
      `python gmbscraper.py --city ${city} --keyword "${keyword}" --mongo-uri ${MONGO_URI} --task-id ${taskId}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing GMB scraper: ${error.message}`)
          updateTaskStatus(taskId, "failed", error.message)
          return
        }

        console.log(`GMB scraper output: ${stdout}`)
        updateTaskStatus(taskId, "completed")
      },
    )

    // Close MongoDB connection
    await client.close()

    return NextResponse.json({ taskId })
  } catch (error) {
    console.error("Error starting GMB scraper:", error)
    return NextResponse.json({ error: "Failed to start GMB scraper" }, { status: 500 })
  }
}

async function updateTaskStatus(taskId: string, status: string, error?: string) {
  try {
    const client = new MongoClient(MONGO_URI)
    await client.connect()

    const db = client.db("scraper_tasks")
    const tasksCollection = db.collection("tasks")

    const updateData: any = {
      status,
      endTime: new Date(),
    }

    if (error) {
      updateData.error = error
    }

    await tasksCollection.updateOne({ _id: taskId }, { $set: updateData })

    await client.close()
  } catch (error) {
    console.error("Error updating task status:", error)
  }
}
