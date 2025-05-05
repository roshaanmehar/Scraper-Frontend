export async function GET(request: Request) {
    // Get the search query from the URL
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
  
    // Mock data for cities
    const mockCities = [
      { _id: "1", area_covered: "London", postcode_area: "SW1" },
      { _id: "2", area_covered: "Manchester", postcode_area: "M1" },
      { _id: "3", area_covered: "Birmingham", postcode_area: "B1" },
      { _id: "4", area_covered: "Liverpool", postcode_area: "L1" },
      { _id: "5", area_covered: "Leeds", postcode_area: "LS1" },
      { _id: "6", area_covered: "Glasgow", postcode_area: "G1" },
      { _id: "7", area_covered: "Edinburgh", postcode_area: "EH1" },
      { _id: "8", area_covered: "Bristol", postcode_area: "BS1" },
      { _id: "9", area_covered: "Newcastle", postcode_area: "NE1" },
      { _id: "10", area_covered: "Sheffield", postcode_area: "S1" },
    ]
  
    // Filter cities based on search query
    const filteredCities = search
      ? mockCities.filter((city) => city.area_covered.toLowerCase().includes(search.toLowerCase()))
      : []
  
    return Response.json(filteredCities)
  }
  