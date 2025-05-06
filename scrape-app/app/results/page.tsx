import { getRestaurants } from "./actions"
import SearchComponent from "./search-component"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams before accessing its properties
  const params = await searchParams

  // Get page parameter and parse it safely
  const pageParam = params.page
  const page = typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1

  console.log(`Fetching page ${page} from MongoDB...`)

  // Get data from MongoDB
  const { restaurants, pagination } = await getRestaurants(page)

  console.log(`Received ${restaurants.length} restaurants from MongoDB`)

  return (
    <div className="container">
      <h1>Search Results</h1>

      <SearchComponent initialRestaurants={restaurants} initialPagination={pagination} initialQuery="" />
    </div>
  )
}
