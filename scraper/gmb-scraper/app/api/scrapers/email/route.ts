import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { exec } from "child_process"
import { v4 as uuidv4 } from "uuid"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function POST(request: Request) {
  try {
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
      type: "email",
      status: "running",
      startTime: new Date(),
      progress: {
        processed: 0,
        total: 0,
        emailsFound: 0,
      },
      logs: [],
    })

    // Execute the Python script
    // In a real implementation, you would use a task queue like Celery
    // This is a simplified example
    const pythonProcess = exec(
      `python emailscraper.py --mongo-uri ${MONGO_URI} --task-id ${taskId}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing email scraper: ${error.message}`)
          updateTaskStatus(taskId, "failed", error.message)
          return
        }

        console.log(`Email scraper output: ${stdout}`)
        updateTaskStatus(taskId, "completed")
      },
    )

    // Close MongoDB connection
    await client.close()

    return NextResponse.json({ taskId })
  } catch (error) {
    console.error("Error starting email scraper:", error)
    return NextResponse.json({ error: "Failed to start email scraper" }, { status: 500 })
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
