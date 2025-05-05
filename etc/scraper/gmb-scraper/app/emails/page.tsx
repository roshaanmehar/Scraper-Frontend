"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Mail, Check, X, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { startEmailScraper, getEmailScraperStatus } from "@/lib/api"
import { useScraperContext } from "@/context/scraper-context"

export default function EmailsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { setActiveTask } = useScraperContext()
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const handleStartEmailScraper = async () => {
    setIsLoading(true)
    setLogs([])

    try {
      const taskId = await startEmailScraper()

      // Set the active task in context
      setActiveTask({
        id: taskId,
        type: "email",
        status: "running",
        startTime: new Date().toISOString(),
      })

      toast({
        title: "Email scraper started successfully",
        description: "Extracting emails from business websites",
      })

      // Add initial log entry
      addLogEntry({
        timestamp: new Date().toISOString(),
        message: "Email scraper started",
        type: "info",
      })

      // Start polling for updates
      const interval = setInterval(async () => {
        try {
          const status = await getEmailScraperStatus(taskId)

          if (status.logs && status.logs.length > 0) {
            // Add new logs
            status.logs.forEach((log) => {
              addLogEntry(log)
            })
          }

          if (status.status === "completed" || status.status === "failed") {
            clearInterval(interval)
            setPollingInterval(null)
            setIsLoading(false)

            addLogEntry({
              timestamp: new Date().toISOString(),
              message: `Email scraper ${status.status}`,
              type: status.status === "completed" ? "success" : "error",
            })
          }
        } catch (error) {
          console.error("Failed to get email scraper status:", error)
        }
      }, 2000)

      setPollingInterval(interval)
    } catch (error) {
      console.error("Failed to start email scraper:", error)
      setIsLoading(false)
      toast({
        title: "Failed to start email scraper",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const addLogEntry = (entry: LogEntry) => {
    // Check if this log entry already exists to avoid duplicates
    setLogs((prevLogs) => {
      if (prevLogs.some((log) => log.timestamp === entry.timestamp && log.message === entry.message)) {
        return prevLogs
      }
      return [...prevLogs, entry]
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
          Email Scraper
        </h1>
        <p className="text-gray-400 mt-2">Extract emails and social media profiles from business websites</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Extraction
            </CardTitle>
            <CardDescription>Start the email scraper to process websites from the database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
              This will process all business records with websites and extract emails and social media profiles. The
              process runs in the background and may take some time depending on the number of websites.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              onClick={handleStartEmailScraper}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Websites...
                </>
              ) : (
                "Start Email Scraper"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Scraper Log</CardTitle>
            <CardDescription>Real-time output from the email scraper</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 rounded-md p-4 h-[400px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">No logs yet. Start the scraper to see output.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <LogItem key={index} log={log} />
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface LogEntry {
  timestamp: string
  message: string
  type: "info" | "success" | "error" | "warning"
  data?: {
    business?: string
    website?: string
    emails?: string[]
    social?: Record<string, string>
  }
}

function LogItem({ log }: { log: LogEntry }) {
  const iconMap = {
    info: <Mail className="h-4 w-4 text-blue-400" />,
    success: <Check className="h-4 w-4 text-green-400" />,
    error: <X className="h-4 w-4 text-red-400" />,
    warning: <Mail className="h-4 w-4 text-yellow-400" />,
  }

  const colorMap = {
    info: "text-blue-400",
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
  }

  const time = new Date(log.timestamp).toLocaleTimeString()

  return (
    <div className="flex">
      <div className="mr-2 mt-1">{iconMap[log.type]}</div>
      <div>
        <div className="flex items-center">
          <span className={`font-medium ${colorMap[log.type]}`}>[{time}]</span>
          <span className="ml-2">{log.message}</span>
        </div>

        {log.data && log.data.business && (
          <div className="ml-6 mt-1 text-gray-400">
            <div>Business: {log.data.business}</div>
            {log.data.website && (
              <div className="flex items-center">
                Website:
                <a
                  href={log.data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline ml-1 flex items-center"
                >
                  {log.data.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
            {log.data.emails && log.data.emails.length > 0 && (
              <div>
                Emails:
                <span className="text-green-400 ml-1">{log.data.emails.join(", ")}</span>
              </div>
            )}
            {log.data.social && Object.keys(log.data.social).length > 0 && (
              <div>
                Social:
                {Object.entries(log.data.social).map(([platform, url], i) => (
                  <span key={platform} className="ml-1">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      {platform}
                    </a>
                    {i < Object.keys(log.data?.social || {}).length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, percentage = null }) {
  return (
    <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
      <div className="p-6">
        <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
        <p className="text-3xl font-bold">{value}</p>
        {percentage !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Success Rate</span>
              <span>{percentage}%</span>
            </div>
            <Progress
              value={percentage}
              className="h-1 bg-gray-700"
              indicatorClassName="bg-gradient-to-r from-blue-500 to-cyan-500"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

function StatusBreakdown({ title, items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span>{item.label}</span>
              <span>
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
            <Progress value={(item.value / total) * 100} className="h-2 bg-gray-700" indicatorClassName={item.color} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusItem({ title, value, status = "normal" }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800">
      <span className="text-gray-400">{title}</span>
      <span
        className={`font-medium ${status === "warning" ? "text-yellow-400" : status === "error" ? "text-red-400" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

function SocialIcon({ type }) {
  const colors = {
    facebook: "text-blue-400",
    twitter: "text-sky-400",
    instagram: "text-pink-400",
    linkedin: "text-blue-300",
  }

  return (
    <span className={`${colors[type]}`}>
      {type === "facebook" && "f"}
      {type === "twitter" && "t"}
      {type === "instagram" && "i"}
      {type === "linkedin" && "in"}
    </span>
  )
}

function getStatusColor(status) {
  switch (status) {
    case "Completed":
      return "bg-green-900 text-green-300"
    case "Processing":
      return "bg-blue-900 text-blue-300"
    case "Failed":
      return "bg-red-900 text-red-300"
    case "Pending":
      return "bg-yellow-900 text-yellow-300"
    default:
      return "bg-gray-800 text-gray-300"
  }
}

// Sample data
const emailData = [
  {
    name: "The Hungry Chef",
    website: "https://thehungrychef.co.uk",
    email: "info@thehungrychef.co.uk",
    social: { facebook: true, twitter: true, instagram: true, linkedin: false },
    status: "Completed",
  },
  {
    name: "Spice Garden",
    website: "https://spicegarden.co.uk",
    email: "contact@spicegarden.co.uk",
    social: { facebook: true, twitter: false, instagram: true, linkedin: false },
    status: "Completed",
  },
  {
    name: "Burger Palace",
    website: "https://burgerpalace.co.uk",
    email: null,
    social: { facebook: true, twitter: true, instagram: false, linkedin: false },
    status: "Failed",
  },
  {
    name: "Pizza Express",
    website: "https://pizzaexpress.com",
    email: "info@pizzaexpress.com",
    social: { facebook: true, twitter: true, instagram: true, linkedin: true },
    status: "Completed",
  },
  {
    name: "Golden Dragon",
    website: "https://goldendragon.co.uk",
    email: "bookings@goldendragon.co.uk",
    social: { facebook: true, twitter: false, instagram: false, linkedin: false },
    status: "Completed",
  },
  {
    name: "Café Delight",
    website: "https://cafedelight.co.uk",
    email: null,
    social: { facebook: false, twitter: false, instagram: true, linkedin: false },
    status: "Processing",
  },
]
