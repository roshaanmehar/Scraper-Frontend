"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { startGmbScraper } from "@/lib/api"
import { useScraperContext } from "@/context/scraper-context"

export default function Home() {
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { setActiveTask } = useScraperContext()

  const handleStartScraper = async () => {
    if (!city.trim()) {
      toast({
        title: "City is required",
        description: "Please enter a city name to continue",
        variant: "destructive",
      })
      return
    }

    if (!keyword.trim()) {
      toast({
        title: "Keyword is required",
        description: "Please enter a keyword to continue",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const taskId = await startGmbScraper(city, keyword)

      // Set the active task in context
      setActiveTask({
        id: taskId,
        type: "gmb",
        status: "running",
        city,
        keyword,
        startTime: new Date().toISOString(),
      })

      toast({
        title: "Scraper started successfully",
        description: `Scraping ${keyword} in ${city}`,
      })

      // Redirect to tasks page
      router.push("/tasks")
    } catch (error) {
      console.error("Failed to start scraper:", error)
      toast({
        title: "Failed to start scraper",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-500">
            Data Scraper Dashboard
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Monitor and visualize your scraping operations in real-time
          </p>
        </header>

        <div className="max-w-md mx-auto">
          <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Start New Scraper</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Enter city and keyword to begin scraping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City Name (MongoDB Database)</Label>
                <Input
                  id="city"
                  placeholder="e.g. Leeds"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-black/20 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  placeholder="e.g. restaurants"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="bg-black/20 border-gray-700"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="scraper-toggle">Start Scraper</Label>
                  <p className="text-sm text-gray-400">Begin scraping data</p>
                </div>
                <Switch
                  id="scraper-toggle"
                  checked={isLoading}
                  onCheckedChange={handleStartScraper}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                onClick={handleStartScraper}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Scraper...
                  </>
                ) : (
                  "Start Scraper"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
