import { ArrowLeft, Download, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function BusinessesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
            Google Maps Scraper
          </h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Businesses" value="1,832" />
          <StatCard title="With Phone Numbers" value="1,654" percentage={90} />
          <StatCard title="With Websites" value="1,245" percentage={68} />
          <StatCard title="With Addresses" value="1,788" percentage={98} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="col-span-2 bg-black/30 backdrop-blur-sm border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Scraping Progress by Subsector</h2>
              <div className="space-y-6">
                {scrapingProgress.map((item, index) => (
                  <ProgressItem key={index} {...item} />
                ))}
              </div>
            </div>
          </Card>

          <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Scraper Status</h2>
              <div className="space-y-4">
                <StatusItem title="Active Threads" value="3/5" />
                <StatusItem title="Current Subsector" value="LS2 1" />
                <StatusItem title="Processing Speed" value="42 records/min" />
                <StatusItem title="Uptime" value="3h 24m" />
                <StatusItem title="Memory Usage" value="512 MB" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-black/30 backdrop-blur-sm border-gray-800 p-6">
          <h2 className="text-xl font-bold mb-4">Recent Businesses</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4">Business Name</th>
                  <th className="text-left py-3 px-4">Subsector</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Website</th>
                  <th className="text-left py-3 px-4">Rating</th>
                </tr>
              </thead>
              <tbody>
                {businessData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4">{item.subsector}</td>
                    <td className="py-3 px-4">{item.phone || "N/A"}</td>
                    <td className="py-3 px-4">
                      {item.website ? (
                        <a href="#" className="text-blue-400 hover:underline truncate block max-w-[200px]">
                          {item.website}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">★</span>
                        <span>{item.rating}</span>
                        <span className="text-gray-400 ml-1">({item.reviews})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              <span>Completion</span>
              <span>{percentage}%</span>
            </div>
            <Progress
              value={percentage}
              className="h-1 bg-gray-700"
              indicatorClassName="bg-gradient-to-r from-purple-500 to-blue-500"
            />
          </div>
        )}
      </div>
    </Card>
  )
}

function ProgressItem({ subsector, total, completed, status }) {
  const percentage = Math.round((completed / total) * 100)

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-medium">{subsector}</span>
        <span className="text-gray-400">
          {completed}/{total}
        </span>
      </div>
      <div className="flex items-center">
        <div className="flex-1 mr-4">
          <Progress
            value={percentage}
            className="h-2 bg-gray-700"
            indicatorClassName="bg-gradient-to-r from-purple-500 to-blue-500"
          />
        </div>
        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>{status}</span>
      </div>
    </div>
  )
}

function StatusItem({ title, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800">
      <span className="text-gray-400">{title}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function getStatusColor(status) {
  switch (status) {
    case "Completed":
      return "bg-green-900 text-green-300"
    case "In Progress":
      return "bg-blue-900 text-blue-300"
    case "Pending":
      return "bg-yellow-900 text-yellow-300"
    default:
      return "bg-gray-800 text-gray-300"
  }
}

// Sample data
const scrapingProgress = [
  { subsector: "LS1 1", total: 120, completed: 120, status: "Completed" },
  { subsector: "LS1 2", total: 95, completed: 95, status: "Completed" },
  { subsector: "LS2 1", total: 110, completed: 68, status: "In Progress" },
  { subsector: "BD1 1", total: 85, completed: 0, status: "Pending" },
  { subsector: "BD1 2", total: 90, completed: 0, status: "Pending" },
]

const businessData = [
  {
    name: "The Hungry Chef",
    subsector: "LS2 1",
    phone: "0113 123 4567",
    website: "https://thehungrychef.co.uk",
    rating: 4.7,
    reviews: 128,
  },
  {
    name: "Spice Garden",
    subsector: "LS2 1",
    phone: "0113 987 6543",
    website: "https://spicegarden.co.uk",
    rating: 4.2,
    reviews: 87,
  },
  {
    name: "Burger Palace",
    subsector: "LS2 1",
    phone: "0113 456 7890",
    website: "https://burgerpalace.co.uk",
    rating: 4.5,
    reviews: 156,
  },
  {
    name: "Pizza Express",
    subsector: "LS1 2",
    phone: "0113 111 2222",
    website: "https://pizzaexpress.com",
    rating: 4.0,
    reviews: 203,
  },
  { name: "Golden Dragon", subsector: "LS1 2", phone: "0113 333 4444", website: null, rating: 3.8, reviews: 64 },
  {
    name: "Café Delight",
    subsector: "LS1 1",
    phone: null,
    website: "https://cafedelight.co.uk",
    rating: 4.6,
    reviews: 92,
  },
]
