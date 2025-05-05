"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Mail, MapPin, BarChart, ListTodo, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useScraperContext } from "@/context/scraper-context"

export default function Navbar() {
  const pathname = usePathname()
  const { activeTask } = useScraperContext()

  // Skip navbar on home page
  if (pathname === "/") {
    return null
  }

  const links = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart,
    },
    {
      name: "Emails",
      href: "/emails",
      icon: Mail,
    },
    {
      name: "Postcodes",
      href: "/postcodes",
      icon: MapPin,
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: ListTodo,
      hasActiveTask: activeTask?.status === "running",
    },
  ]

  return (
    <nav className="border-b border-gray-800 bg-black/40 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-500">
                Scraper Dashboard
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5",
                )}
              >
                <span className="flex items-center">
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.name}
                  {link.hasActiveTask && (
                    <span className="absolute top-1 right-1">
                      <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
