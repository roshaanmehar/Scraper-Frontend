import { getRestaurants } from "./actions"
import SearchComponent from "./search-component"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get page parameter directly
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1

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
