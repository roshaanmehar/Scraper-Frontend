import { NextResponse } from "next/server"

// This is a simple mock API for demonstration purposes
export async function GET(request: Request) {
  const url = new URL(request.url)
  const search = url.searchParams.get("search") || ""

  // Mock data for city search
  const cities = [
    { _id: "1", area_covered: "London", postcode_area: "SW1" },
    { _id: "2", area_covered: "Manchester", postcode_area: "M1" },
    { _id: "3", area_covered: "Birmingham", postcode_area: "B1" },
    { _id: "4", area_covered: "Liverpool", postcode_area: "L1" },
    { _id: "5", area_covered: "Leeds", postcode_area: "LS1" },
    { _id: "6", area_covered: "Bristol", postcode_area: "BS1" },
    { _id: "7", area_covered: "Newcastle", postcode_area: "NE1" },
    { _id: "8", area_covered: "Edinburgh", postcode_area: "EH1" },
    { _id: "9", area_covered: "Glasgow", postcode_area: "G1" },
    { _id: "10", area_covered: "Cardiff", postcode_area: "CF1" },
  ]

  if (!search) {
    return NextResponse.json([])
  }

  const filteredCities = cities.filter((city) => city.area_covered.toLowerCase().includes(search.toLowerCase()))

  return NextResponse.json(filteredCities)
}
