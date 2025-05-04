import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filePath = searchParams.get("path")
    const lines = Number.parseInt(searchParams.get("lines") || "100")

    if (!filePath) {
      // If no specific file is requested, list all log files
      const logsDir = path.join(process.cwd(), "logs")

      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const files = fs
        .readdirSync(logsDir)
        .filter((file) => file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join("logs", file),
          size: fs.statSync(path.join(logsDir, file)).size,
          modified: fs.statSync(path.join(logsDir, file)).mtime,
        }))
        .sort((a, b) => b.modified.getTime() - a.modified.getTime())

      return NextResponse.json({ success: true, files })
    }

    // Ensure the file path is within the logs directory
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith("logs/") && !normalizedPath.startsWith("logs\\")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid log file path",
        },
        { status: 400 },
      )
    }

    const fullPath = path.join(process.cwd(), normalizedPath)

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "Log file not found",
        },
        { status: 404 },
      )
    }

    // Read the last N lines of the log file
    const content = fs.readFileSync(fullPath, "utf-8")
    const allLines = content.split("\n")
    const lastLines = allLines.slice(-lines).join("\n")

    return NextResponse.json({
      success: true,
      content: lastLines,
      totalLines: allLines.length,
    })
  } catch (error) {
    console.error("Error in logs API:", error)
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
