import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execPromise = promisify(exec)

// Base directory for logs
const LOGS_DIR = path.join(process.cwd(), "logs")

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    switch (action) {
      case "status":
        return await getScraperStatus()
      case "logs":
        const scraperType = searchParams.get("type")
        const lines = Number.parseInt(searchParams.get("lines") || "100")
        return await getScraperLogs(scraperType, lines)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in GET handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, params } = body

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    switch (action) {
      case "start_postcode_scraper":
        return await startPostcodeScraper(params)
      case "start_gmb_scraper":
        return await startGmbScraper(params)
      case "start_email_scraper":
        return await startEmailScraper(params)
      case "stop_scraper":
        return await stopScraper(params?.type)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST handler:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getScraperStatus() {
  try {
    // Check if any scraper processes are running
    const { stdout } = await execPromise('ps aux | grep -E "postcodesscraper|gmbscraper|emailsdcraper" | grep -v grep')

    // Parse the running processes
    const processes = stdout.trim().split("\n").filter(Boolean)

    const runningScrapers = {
      postcode: processes.some((p) => p.includes("postcodesscraper")),
      gmb: processes.some((p) => p.includes("gmbscraper")),
      email: processes.some((p) => p.includes("emailsdcraper")),
    }

    // Get MongoDB stats if possible
    let dbStats = {}
    try {
      const { stdout: mongoStats } = await execPromise(
        'python3 -c "from pymongo import MongoClient; client = MongoClient(); db = client.Leeds; print({\\"subsector_queue\\": db.subsector_queue.count_documents({}), \\"restaurants\\": db.restaurants.count_documents({}), \\"pending_emails\\": db.restaurants.count_documents({\\"emailstatus\\": \\"pending\\"})});"',
      )
      dbStats = JSON.parse(mongoStats.trim())
    } catch (error) {
      console.error("Error getting MongoDB stats:", error)
      dbStats = { error: "Failed to get MongoDB stats" }
    }

    return NextResponse.json({
      running: runningScrapers,
      dbStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // If the grep command returns nothing, no processes are running
    return NextResponse.json({
      running: {
        postcode: false,
        gmb: false,
        email: false,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

async function getScraperLogs(scraperType: string | null, lines: number) {
  // Validate and sanitize input
  if (!scraperType || !["postcode", "gmb", "email", "all"].includes(scraperType)) {
    return NextResponse.json({ error: "Invalid scraper type" }, { status: 400 })
  }

  // Limit the number of lines for security
  const safeLines = Math.min(Math.max(lines, 10), 1000)

  let logContent = ""

  try {
    if (scraperType === "all") {
      // Combine logs from all scrapers
      const logFiles = ["scraper.log", "email_scraper.log"]
      for (const file of logFiles) {
        const logPath = path.join(LOGS_DIR, file)
        if (fs.existsSync(logPath)) {
          const { stdout } = await execPromise(`tail -n ${safeLines} ${logPath}`)
          logContent += `=== ${file} ===\n${stdout}\n\n`
        }
      }
    } else {
      // Get logs for specific scraper
      const logFile = scraperType === "email" ? "email_scraper.log" : "scraper.log"
      const logPath = path.join(LOGS_DIR, logFile)

      if (fs.existsSync(logPath)) {
        const { stdout } = await execPromise(`tail -n ${safeLines} ${logPath}`)
        logContent = stdout
      } else {
        return NextResponse.json({ error: "Log file not found" }, { status: 404 })
      }
    }

    return NextResponse.json({
      logs: logContent.split("\n"),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting logs:", error)
    return NextResponse.json({ error: "Failed to retrieve logs" }, { status: 500 })
  }
}

async function startPostcodeScraper(params: any) {
  try {
    const { prefix, city, mongoUri, workers, headless } = params || {}

    if (!prefix || !city) {
      return NextResponse.json({ error: "Missing required parameters: prefix and city" }, { status: 400 })
    }

    // Build command with parameters
    let command = `python3 scripts/postcodesscraper.py --prefix "${prefix}" --city "${city}"`

    if (mongoUri) command += ` --mongo-uri "${mongoUri}"`
    if (workers) command += ` --workers ${workers}`
    if (headless) command += ` --headless`

    // Run in background
    command += " > logs/postcode_scraper_output.log 2>&1 &"

    await execPromise(command)

    return NextResponse.json({
      success: true,
      message: "Postcode scraper started",
      params: { prefix, city, workers, headless },
    })
  } catch (error) {
    console.error("Error starting postcode scraper:", error)
    return NextResponse.json({ error: "Failed to start postcode scraper" }, { status: 500 })
  }
}

async function startGmbScraper(params: any) {
  try {
    const { subsector, start, end, headless, mongoUri, debug, fast } = params || {}

    // Build command with parameters
    let command = "python3 scripts/gmbscraper.py"

    if (subsector) command += ` --subsector "${subsector}"`
    if (start !== undefined) command += ` --start ${start}`
    if (end !== undefined) command += ` --end ${end}`
    if (headless) command += " --headless"
    if (debug) command += " --debug"
    if (fast) command += " --fast"
    if (mongoUri) command += ` --mongo-uri "${mongoUri}"`

    // Run in background
    command += " > logs/gmb_scraper_output.log 2>&1 &"

    await execPromise(command)

    return NextResponse.json({
      success: true,
      message: "GMB scraper started",
      params: { subsector, start, end, headless, debug, fast },
    })
  } catch (error) {
    console.error("Error starting GMB scraper:", error)
    return NextResponse.json({ error: "Failed to start GMB scraper" }, { status: 500 })
  }
}

async function startEmailScraper(params: any) {
  try {
    const { threads, headless, debug, mongoUri, dbName, collection, maxSites, exportCsv } = params || {}

    // Build command with parameters
    let command = "python3 scripts/emailsdcraper.py"

    if (threads) command += ` --threads ${threads}`
    if (headless) command += " --headless"
    if (debug) command += " --debug"
    if (mongoUri) command += ` --mongo-uri "${mongoUri}"`
    if (dbName) command += ` --db-name "${dbName}"`
    if (collection) command += ` --collection "${collection}"`
    if (maxSites) command += ` --max-sites ${maxSites}`
    if (exportCsv) command += ` --export-csv "${exportCsv}"`

    // Run in background
    command += " > logs/email_scraper_output.log 2>&1 &"

    await execPromise(command)

    return NextResponse.json({
      success: true,
      message: "Email scraper started",
      params: { threads, headless, debug, dbName, collection, maxSites, exportCsv },
    })
  } catch (error) {
    console.error("Error starting email scraper:", error)
    return NextResponse.json({ error: "Failed to start email scraper" }, { status: 500 })
  }
}

async function stopScraper(type: string | undefined) {
  try {
    if (!type || !["postcode", "gmb", "email", "all"].includes(type)) {
      return NextResponse.json({ error: "Invalid scraper type" }, { status: 400 })
    }

    let command = ""
    if (type === "all") {
      command =
        'pkill -f "python3 scripts/postcodesscraper.py" || true; pkill -f "python3 scripts/gmbscraper.py" || true; pkill -f "python3 scripts/emailsdcraper.py" || true'
    } else {
      const scriptName =
        type === "postcode" ? "postcodesscraper.py" : type === "gmb" ? "gmbscraper.py" : "emailsdcraper.py"
      command = `pkill -f "python3 scripts/${scriptName}" || true`
    }

    await execPromise(command)

    return NextResponse.json({
      success: true,
      message: `${type === "all" ? "All scrapers" : `${type} scraper`} stopped`,
    })
  } catch (error) {
    console.error("Error stopping scraper:", error)
    return NextResponse.json({ error: "Failed to stop scraper" }, { status: 500 })
  }
}
