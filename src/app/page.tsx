"use client"
import AppLayout from "@/components/layout/AppLayout"
import ScraperForm from "@/components/ScraperForm"

export default function Home() {
  return (
    <AppLayout activeTab="home">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Business Data Scraper</h1>
            <p className="text-gray-600">Automate scraping of business data from postcodes to emails</p>
          </div>

          <div className="grid grid-cols-1 gap-8 mb-8">
            <ScraperForm />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="font-medium">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Postcode Scraping</h3>
                  <p className="text-sm text-gray-600">
                    The system scrapes postcode data for the specified city and organizes it into sectors and
                    subsectors.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="font-medium">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Google Maps Business Scraping</h3>
                  <p className="text-sm text-gray-600">
                    For each subsector, the system scrapes business information from Google Maps, including names,
                    addresses, phone numbers, and websites.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="font-medium">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Email & Social Media Scraping</h3>
                  <p className="text-sm text-gray-600">
                    The system visits each business website to extract email addresses and social media profiles,
                    completing the data collection process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
