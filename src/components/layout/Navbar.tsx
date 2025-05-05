import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { Database, Home, ListChecks, Search } from "lucide-react"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Business Scraper</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </div>
            </Link>
            <Link href="/jobs" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <div className="flex items-center gap-1">
                <ListChecks className="h-4 w-4" />
                <span>Jobs</span>
              </div>
            </Link>
            <Link href="/results" className="transition-colors hover:text-foreground/80 text-foreground/60">
              <div className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                <span>Results</span>
              </div>
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="outline" asChild className="inline-flex items-center md:hidden">
              <Link href="/">
                <Database className="mr-2 h-4 w-4" />
                Business Scraper
              </Link>
            </Button>
          </div>
          <nav className="flex items-center">
            <ModeToggle />
            <Link href="/jobs" className="ml-4 md:hidden">
              <Button variant="ghost" size="icon">
                <ListChecks className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/results" className="ml-2 md:hidden">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
