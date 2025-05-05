import { searchRestaurants } from "../actions"
import SearchComponent from "../search-component"

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get search parameters directly
  const query = typeof searchParams.query === "string" ? searchParams.query : ""
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1

  console.log(`Searching for "${query}" on page ${page}...`)

  // Get data from MongoDB
  const { restaurants, pagination } = await searchRestaurants(query, page)

  console.log(`Found ${restaurants.length} restaurants matching "${query}"`)

  return (
    <div className="container">
      <h1>Search Results</h1>

      <SearchComponent initialRestaurants={restaurants} initialPagination={pagination} initialQuery={query} />
    </div>
  )
}
