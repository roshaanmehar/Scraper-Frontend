"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getDashboardStats } from "@/lib/api"
import { Loader2, Mail, MapPin, Store, Users } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats()
        setStats(data)
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err)
        setError("Failed to load dashboard statistics")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-md">
          <p>{error}</p>
          <p className="text-sm mt-2">Please check your MongoDB connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Overview of your scraping operations and database statistics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Businesses"
          value={stats?.totalBusinesses || 0}
          icon={<Store className="h-5 w-5" />}
          gradient="from-purple-600 to-blue-600"
        />
        <StatCard
          title="Businesses with Emails"
          value={stats?.businessesWithEmails || 0}
          percentage={stats ? Math.round((stats.businessesWithEmails / stats.totalBusinesses) * 100) : 0}
          icon={<Mail className="h-5 w-5" />}
          gradient="from-blue-600 to-cyan-600"
        />
        <StatCard
          title="Postcodes"
          value={stats?.totalPostcodes || 0}
          icon={<MapPin className="h-5 w-5" />}
          gradient="from-pink-600 to-purple-600"
        />
        <StatCard
          title="Social Profiles"
          value={stats?.totalSocialProfiles || 0}
          icon={<Users className="h-5 w-5" />}
          gradient="from-orange-600 to-pink-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Email Extraction Progress</CardTitle>
            <CardDescription>Status of email extraction from business websites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ProgressSection
                title="Email Status"
                items={[
                  {
                    label: "Found",
                    value: stats?.businessesWithEmails || 0,
                    color: "bg-green-500",
                  },
                  {
                    label: "Checked (No Email)",
                    value: stats?.businessesCheckedNoEmail || 0,
                    color: "bg-yellow-500",
                  },
                  {
                    label: "Failed",
                    value: stats?.businessesFailed || 0,
                    color: "bg-red-500",
                  },
                  {
                    label: "Pending",
                    value: stats?.businessesPendingEmail || 0,
                    color: "bg-gray-500",
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Social Media Profiles</CardTitle>
            <CardDescription>Distribution of social media profiles found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ProgressSection
                title="Platform Distribution"
                items={[
                  {
                    label: "Facebook",
                    value: stats?.socialProfiles?.facebook || 0,
                    color: "bg-blue-600",
                  },
                  {
                    label: "Twitter",
                    value: stats?.socialProfiles?.twitter || 0,
                    color: "bg-sky-500",
                  },
                  {
                    label: "Instagram",
                    value: stats?.socialProfiles?.instagram || 0,
                    color: "bg-pink-600",
                  },
                  {
                    label: "LinkedIn",
                    value: stats?.socialProfiles?.linkedin || 0,
                    color: "bg-blue-800",
                  },
                  {
                    label: "Other",
                    value: stats?.socialProfiles?.other || 0,
                    color: "bg-purple-500",
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <CardTitle>Subsector Distribution</CardTitle>
            <CardDescription>Top subsectors by number of businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topSubsectors?.map((subsector, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span>{subsector.name}</span>
                    <span className="text-gray-400">{subsector.count} businesses</span>
                  </div>
                  <Progress
                    value={subsector.percentage}
                    className="h-2 bg-gray-700"
                    indicatorClassName="bg-gradient-to-r from-purple-500 to-blue-500"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, percentage = null, icon, gradient }) {
  return (
    <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>{icon}</div>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        </div>
        <h3 className="text-gray-400 text-sm">{title}</h3>

        {percentage !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Completion</span>
              <span>{percentage}%</span>
            </div>
            <Progress
              value={percentage}
              className="h-1 bg-gray-700"
              indicatorClassName={`bg-gradient-to-r ${gradient}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProgressSection({ title, items }) {
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
                {item.value.toLocaleString()} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </div>
            <Progress
              value={total > 0 ? (item.value / total) * 100 : 0}
              className="h-2 bg-gray-700"
              indicatorClassName={item.color}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface DashboardStats {
  totalBusinesses: number
  businessesWithWebsites: number
  businessesWithEmails: number
  businessesCheckedNoEmail: number
  businessesFailed: number
  businessesPendingEmail: number
  totalPostcodes: number
  totalSocialProfiles: number
  socialProfiles: {
    facebook: number
    twitter: number
    instagram: number
    linkedin: number
    other: number
  }
  topSubsectors: Array<{
    name: string
    count: number
    percentage: number
  }>
}
