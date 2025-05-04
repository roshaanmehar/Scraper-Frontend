export interface Business {
    id: string
    name: string
    address: string
    phone: string
    website: string
    email: string
    category: string
  }
  
  // Generate mock business data
  export const mockBusinessData: Business[] = Array.from({ length: 50 }, (_, i) => {
    const id = `biz-${i + 1}`
    const categories = [
      "Restaurant",
      "Cafe",
      "Bar",
      "Hotel",
      "Retail",
      "Supermarket",
      "Gym",
      "Salon",
      "Dentist",
      "Mechanic",
    ]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const cities = ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh"]
    const city = cities[Math.floor(Math.random() * cities.length)]
    const streets = ["High Street", "Main Street", "Park Road", "Church Lane", "Station Road", "Market Street"]
    const street = streets[Math.floor(Math.random() * streets.length)]
    const streetNumber = Math.floor(Math.random() * 200) + 1
    const hasEmail = Math.random() > 0.3
    const hasWebsite = Math.random() > 0.2
  
    return {
      id,
      name: `${category} ${Math.floor(Math.random() * 100) + 1}`,
      address: `${streetNumber} ${street}, ${city}`,
      phone: `+44 ${Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(10, "0")}`,
      website: hasWebsite ? `https://www.business${i + 1}.com` : "",
      email: hasEmail ? `info@business${i + 1}.com` : "",
      category,
    }
  })
  