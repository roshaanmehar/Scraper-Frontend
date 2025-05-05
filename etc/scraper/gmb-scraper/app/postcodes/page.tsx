"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MapPin } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { startPostcodeScraper } from "@/lib/api"
import { useScraperContext } from "@/context/scraper-context"
import { useRouter } from "next/navigation"

export default function PostcodesPage() {
  const [url, setUrl] = useState("")
  const [granularity, setGranularity] = useState("subsector")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { setActiveTask } = useScraperContext()
  const router = useRouter()

  const handleStartPostcodeScraper = async () => {
    if (!url.trim()) {
      toast({
        title: "URL is required",
        description: "Please enter a URL to continue",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const taskId = await startPostcodeScraper(url, granularity)

      // Set the active task in context
      setActiveTask({
        id: taskId,
        type: "postcode",
        status: "running",
        url,
        granularity,
        startTime: new Date().toISOString(),
      })

      toast({
        title: "Postcode scraper started successfully",
        description: `Scraping postcodes with ${granularity} granularity`,
      })

      // Redirect to tasks page
      router.push("/tasks")
    } catch (error) {
      console.error("Failed to start postcode scraper:", error)
      toast({
        title: "Failed to start postcode scraper",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
          Postcode Scraper
        </h1>
        <p className="text-gray-400 mt-2">Extract postcodes from doogal.co.uk with configurable granularity</p>
      </header>

      <div className="max-w-md mx-auto">
        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Postcode Extraction
            </CardTitle>
            <CardDescription>Configure and start the postcode scraper</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL or Prefix</Label>
              <Input
                id="url"
                placeholder="e.g. LS1"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-black/20 border-gray-700"
              />
              <p className="text-xs text-gray-400">Enter a postcode prefix (e.g. LS, BD, SW1) or full URL</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="granularity">Granularity</Label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger id="granularity" className="bg-black/20 border-gray-700">
                  <SelectValue placeholder="Select granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sector">Sector (e.g. LS1)</SelectItem>
                  <SelectItem value="subsector">Subsector (e.g. LS1 A)</SelectItem>
                  <SelectItem value="full">Full Postcode (e.g. LS1 AB1)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Sector: Letters before space (LS1)
                <br />
                Subsector: Sector + first letter after space (LS1 A)
                <br />
                Full: Complete postcode (LS1 AB1)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
              onClick={handleStartPostcodeScraper}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Scraper...
                </>
              ) : (
                "Start Postcode Scraper"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 max-w-3xl mx-auto">
        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Postcode Structure</CardTitle>
            <CardDescription>Understanding UK postcode format and granularity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-md">
                <h3 className="font-medium mb-2">Example: LS1 2AB</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="bg-pink-900/50 text-pink-300 px-2 py-1 rounded mr-2 text-xs">Sector</span>
                    <div>
                      <p>
                        <strong>LS1</strong> - The part before the space
                      </p>
                      <p className="text-gray-400 text-xs">Identifies a specific area within a city or district</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded mr-2 text-xs">Subsector</span>
                    <div>
                      <p>
                        <strong>LS1 2</strong> - Sector + first character after space
                      </p>
                      <p className="text-gray-400 text-xs">Further narrows down to a smaller geographical area</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded mr-2 text-xs">Full</span>
                    <div>
                      <p>
                        <strong>LS1 2AB</strong> - Complete postcode
                      </p>
                      <p className="text-gray-400 text-xs">Identifies a specific street or group of addresses</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
