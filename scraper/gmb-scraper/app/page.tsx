import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Mail, MapPin } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">GMB Scraper System</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <MapPin className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle>Postcode Scraper</CardTitle>
              <CardDescription>Scrape postcodes from doogal.co.uk and load into MongoDB</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This module extracts postcodes for a given outward prefix and loads them into MongoDB as subsectors for
                further processing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-8 w-8 mb-2 text-green-500" />
              <CardTitle>GMB Scraper</CardTitle>
              <CardDescription>Scrape business data from Google Maps</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This module extracts business information from Google Maps for each subsector, including name, address,
                phone, and website.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 mb-2 text-purple-500" />
              <CardTitle>Email Scraper</CardTitle>
              <CardDescription>Extract emails and social media profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This module visits business websites to extract email addresses and social media profiles using multiple
                extraction methods.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
