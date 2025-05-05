import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execPromise = promisify(exec)

// City prefix mapping
const CITY_PREFIXES: Record<string, string> = {
  leeds: "LS",
  manchester: "M",
  london: "SW",
  birmingham: "B",
  liverpool: "L",
  newcastle: "NE",
  edinburgh: "EH",
  glasgow: "G",
  cardiff: "CF",
  belfast: "BT",
  lincoln: "LN",
  // Add more cities and their postcode prefixes as needed
}

// Function to run a Python script with given arguments
export async function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  const scriptFullPath = path.join(process.cwd(), "scripts", scriptPath)

  // Check if script exists
  if (!fs.existsSync(scriptFullPath)) {
    throw new Error(`Script not found: ${scriptFullPath}`)
  }

  const command = `python ${scriptFullPath} ${args.join(" ")}`
  console.log(`Running command: ${command}`)

  try {
    const { stdout, stderr } = await execPromise(command)
    if (stderr) {
      console.error(`Script error: ${stderr}`)
    }
    return stdout
  } catch (error) {
    console.error(`Error running script: ${error}`)
    throw error
  }
}

// Check if a city database exists and has postcodes
export async function checkCityDatabase(city: string, mongoUri: string): Promise<boolean> {
  try {
    // Use the mongo command to check if the database exists
    const command = `mongo ${mongoUri}/${city} --eval "db.subsector_queue.countDocuments()"`
    const { stdout } = await execPromise(command)

    // If the count is greater than 0, the database exists and has postcodes
    return stdout.includes("NumberLong(") && !stdout.includes("NumberLong(0)")
  } catch (error) {
    console.error(`Error checking city database: ${error}`)
    return false
  }
}

// Main function to process a city
export async function processCity(city: string, mongoUri: string): Promise<{ success: boolean; message: string }> {
  const cityLower = city.toLowerCase()
  const prefix = CITY_PREFIXES[cityLower]

  if (!prefix) {
    return { success: false, message: `City prefix not found for ${city}` }
  }

  try {
    console.log(`Starting scraping process for ${city} (${prefix})`)

    // Step 1: Check if city already has postcodes
    const hasPostcodes = await checkCityDatabase(cityLower, mongoUri)

    // Step 2: Run postcode scraper if needed
    if (!hasPostcodes) {
      console.log(`Running postcode scraper for ${city}...`)
      await runPythonScript("postcodesScraper.py", [
        "--prefix",
        prefix,
        "--city",
        cityLower,
        "--mongo-uri",
        mongoUri,
        "--workers",
        "4",
        "--headless",
      ])
      console.log(`Postcode scraping completed for ${city}`)
    } else {
      console.log(`Postcodes already exist for ${city}, skipping postcode scraping`)
    }

    // Step 3: Run GMB scraper
    console.log(`Running GMB scraper for ${city}...`)
    await runPythonScript("gmbscraper.py", ["--mongo-uri", mongoUri, "--db-name", cityLower, "--headless", "--fast"])
    console.log(`GMB scraping completed for ${city}`)

    // Step 4: Run email scraper
    console.log(`Running email scraper for ${city}...`)
    await runPythonScript("emailscraper.py", [
      "--mongo-uri",
      mongoUri,
      "--db-name",
      cityLower,
      "--collection",
      "restaurants",
      "--headless",
      "--threads",
      "5",
    ])
    console.log(`Email scraping completed for ${city}`)

    return {
      success: true,
      message: `Scraping completed successfully for ${city}`,
    }
  } catch (error) {
    console.error(`Error processing city ${city}:`, error)
    return {
      success: false,
      message: `Error processing ${city}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
