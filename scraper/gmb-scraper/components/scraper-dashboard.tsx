"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle, Clock, Database, Mail, MapPin, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ScraperDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("postcodes")
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState("")
  const [status, setStatus] = useState<Record<string, any>>({})
  const [stats, setStats] = useState<any>(null)

  // Form states
  const [postcodePrefix, setPostcodePrefix] = useState("LS")
  const [postcodeCity, setPostcodeCity] = useState("Leeds")
  const [gmbSubsector, setGmbSubsector] = useState("LS1 1")

  // Fetch status of scrapers
  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/scraper")
      const data = await response.json()

      if (data.success) {
        const statusMap: Record<string, any> = {}
        data.status.forEach((item: any) => {
          statusMap[item.type] = item
        })
        setStatus(statusMap)
      }
    } catch (error) {
      console.error("Error fetching status:", error)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "stats",
          collection: "restaurants",
        }),
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  // Fetch logs
  const fetchLogs = async (scraperType: string) => {
    if (!status[scraperType]?.logFilePath) return

    try {
      const response = await fetch(`/api/logs?path=${encodeURIComponent(status[scraperType].logFilePath)}&lines=50`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.content)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    }
  }

  // Start scraper
  const startScraper = async (scraperType: string) => {
    setIsLoading(true)

    try {
      let params = {}

      switch (scraperType) {
        case "postcodes":
          params = { prefix: postcodePrefix, city: postcodeCity }
          break
        case "gmb":
          params = { subsector: gmbSubsector }
          break
        case "emails":
          // No specific params needed
          break
      }

      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          scraperType,
          params,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Scraper Started",
          description: `${scraperType} scraper has been started successfully.`,
        })

        // Refresh status
        await fetchStatus()

        // Set active tab to the started scraper
        setActiveTab(scraperType)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to start scraper",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error starting scraper:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Stop scraper
  const stopScraper = async (scraperType: string) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "stop",
          scraperType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Scraper Stopped",
          description: `${scraperType} scraper has been stopped.`,
        })

        // Refresh status
        await fetchStatus()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to stop scraper",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error stopping scraper:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchStatus()
    fetchStats()

    // Set up polling for status and stats
    const statusInterval = setInterval(fetchStatus, 5000)
    const statsInterval = setInterval(fetchStats, 10000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(statsInterval)
    }
  }, [])

  // Fetch logs when active tab or status changes
  useEffect(() => {
    if (status[activeTab]) {
      fetchLogs(activeTab)

      // Poll for logs if scraper is running
      const logsInterval = setInterval(() => fetchLogs(activeTab), 3000)
      return () => clearInterval(logsInterval)
    }
  }, [activeTab, status])

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">GMB Scraper Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Postcodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subsector_queue?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.subsector_queue?.processed || 0} processed, {stats?.subsector_queue?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.restaurants?.total || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.restaurants?.withWebsite || 0} with website</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.restaurants?.withEmail || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.restaurants?.pendingEmail || 0} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Scraper Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="postcodes" className="relative">
            <MapPin className="mr-2 h-4 w-4" />
            Postcodes
            {status.postcodes && (
              <Badge variant="outline" className="absolute -top-2 -right-2 bg-green-500 text-white">
                <Clock className="h-3 w-3" />
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gmb" className="relative">
            <Database className="mr-2 h-4 w-4" />
            GMB Scraper
            {status.gmb && (
              <Badge variant="outline" className="absolute -top-2 -right-2 bg-green-500 text-white">
                <Clock className="h-3 w-3" />
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails" className="relative">
            <Mail className="mr-2 h-4 w-4" />
            Email Scraper
            {status.emails && (
              <Badge variant="outline" className="absolute -top-2 -right-2 bg-green-500 text-white">
                <Clock className="h-3 w-3" />
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "postcodes" && "Postcode Scraper"}
              {activeTab === "gmb" && "Google Maps Business Scraper"}
              {activeTab === "emails" && "Email & Social Media Scraper"}
            </CardTitle>
            <CardDescription>
              {activeTab === "postcodes" && "Scrape postcodes from doogal.co.uk and load into MongoDB"}
              {activeTab === "gmb" && "Scrape business data from Google Maps for specific subsectors"}
              {activeTab === "emails" && "Extract emails and social media profiles from business websites"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6">
              {/* Scraper-specific controls */}
              {activeTab === "postcodes" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Postcode Prefix</Label>
                    <Input
                      id="prefix"
                      placeholder="LS"
                      value={postcodePrefix}
                      onChange={(e) => setPostcodePrefix(e.target.value)}
                      disabled={!!status.postcodes}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Leeds"
                      value={postcodeCity}
                      onChange={(e) => setPostcodeCity(e.target.value)}
                      disabled={!!status.postcodes}
                    />
                  </div>
                </div>
              )}

              {activeTab === "gmb" && (
                <div className="space-y-2">
                  <Label htmlFor="subsector">Subsector</Label>
                  <Input
                    id="subsector"
                    placeholder="LS1 1"
                    value={gmbSubsector}
                    onChange={(e) => setGmbSubsector(e.target.value)}
                    disabled={!!status.gmb}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter a specific subsector to scrape (e.g., LS1 1) or leave empty to process all pending subsectors
                  </p>
                </div>
              )}

              {activeTab === "emails" && (
                <div className="space-y-2">
                  <p className="text-sm">
                    This scraper will process all businesses with websites that have a pending email status.
                  </p>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Make sure you have run the GMB scraper first to collect business websites.
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Status and logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Status</h3>
                  <Button variant="outline" size="sm" onClick={fetchStatus} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <div className="rounded-md bg-muted p-4">
                  {status[activeTab] ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Running since {new Date(status[activeTab].startTime).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span>Not running</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logs */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Logs</h3>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <pre className="text-xs whitespace-pre-wrap">{logs || "No logs available"}</pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            {status[activeTab] ? (
              <Button variant="destructive" onClick={() => stopScraper(activeTab)} disabled={isLoading}>
                Stop Scraper
              </Button>
            ) : (
              <Button onClick={() => startScraper(activeTab)} disabled={isLoading}>
                Start Scraper
              </Button>
            )}

            <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
              Update Stats
            </Button>
          </CardFooter>
        </Card>
      </Tabs>
    </div>
  )
}
