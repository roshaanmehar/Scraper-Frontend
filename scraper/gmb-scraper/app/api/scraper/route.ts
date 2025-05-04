import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"

// Track running processes
const runningProcesses: Record<string, any> = {}

export async function POST(request: NextRequest) {
  try {
    const { action, scraperType, params } = await request.json()

    if (action === "start") {
      // Check if process is already running
      if (runningProcesses[scraperType]) {
        return NextResponse.json({
          success: false,
          message: `${scraperType} is already running`,
        })
      }

      // Determine which script to run
      let scriptPath
      const scriptArgs: string[] = []

      switch (scraperType) {
        case "postcodes":
          scriptPath = path.join(process.cwd(), "scripts", "postcodesscraper.py")
          if (params?.prefix) scriptArgs.push("--prefix", params.prefix)
          if (params?.city) scriptArgs.push("--city", params.city)
          if (params?.mongoUri) scriptArgs.push("--mongo-uri", params.mongoUri)
          break
        case "gmb":
          scriptPath = path.join(process.cwd(), "scripts", "gmbscraper.py")
          if (params?.subsector) scriptArgs.push("--subsector", params.subsector)
          if (params?.mongoUri) scriptArgs.push("--mongo-uri", params.mongoUri)
          break
        case "emails":
          scriptPath = path.join(process.cwd(), "scripts", "emailsdcraper.py")
          if (params?.mongoUri) scriptArgs.push("--mongo-uri", params.mongoUri)
          break
        default:
          return NextResponse.json({
            success: false,
            message: `Unknown scraper type: ${scraperType}`,
          })
      }

      // Create log file path
      const timestamp = new Date().toISOString().replace(/:/g, "-")
      const logFilePath = path.join(process.cwd(), "logs", `${scraperType}-${timestamp}.log`)

      // Create log file stream
      const logStream = fs.createWriteStream(logFilePath, { flags: "a" })

      // Spawn process
      const process = spawn("python", [scriptPath, ...scriptArgs], {
        stdio: ["ignore", "pipe", "pipe"],
      })

      // Store process info
      runningProcesses[scraperType] = {
        process,
        logFilePath,
        startTime: new Date(),
        type: scraperType,
      }

      // Pipe output to log file
      process.stdout.pipe(logStream)
      process.stderr.pipe(logStream)

      // Handle process exit
      process.on("exit", (code) => {
        logStream.end(`Process exited with code ${code}`)
        delete runningProcesses[scraperType]
      })

      return NextResponse.json({
        success: true,
        message: `${scraperType} scraper started`,
        logFilePath,
      })
    } else if (action === "stop") {
      const processInfo = runningProcesses[scraperType]

      if (!processInfo) {
        return NextResponse.json({
          success: false,
          message: `${scraperType} is not running`,
        })
      }

      // Kill the process
      processInfo.process.kill()

      return NextResponse.json({
        success: true,
        message: `${scraperType} scraper stopped`,
      })
    } else if (action === "status") {
      const status = Object.keys(runningProcesses).map((key) => ({
        type: runningProcesses[key].type,
        startTime: runningProcesses[key].startTime,
        logFilePath: runningProcesses[key].logFilePath,
      }))

      return NextResponse.json({
        success: true,
        status,
      })
    }

    return NextResponse.json({
      success: false,
      message: `Unknown action: ${action}`,
    })
  } catch (error) {
    console.error("Error in scraper API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const status = Object.keys(runningProcesses).map((key) => ({
      type: runningProcesses[key].type,
      startTime: runningProcesses[key].startTime,
      logFilePath: runningProcesses[key].logFilePath,
    }))

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error("Error in scraper status API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
