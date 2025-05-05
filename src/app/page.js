"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input, Button, Select, Spin, Alert, Typography } from "antd"
import MainLayout from "../components/MainLayout"
import "./home.css"

const { Title, Text } = Typography
const { Option } = Select

export default function HomePage() {
  const router = useRouter()
  const [citySearch, setCitySearch] = useState("")
  const [keyword, setKeyword] = useState("")
  const [cities, setCities] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchingCities, setIsSearchingCities] = useState(false)
  const [error, setError] = useState("")

  const handleCitySearch = async (value) => {
    if (!value || value.trim().length < 1) {
      setCities([])
      return
    }

    setIsSearchingCities(true)
    try {
      const response = await fetch(`/api/cities?search=${encodeURIComponent(value)}`)
      const data = await response.json()
      setCities(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch cities:", err)
      setCities([])
    } finally {
      setIsSearchingCities(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!selectedCity || !keyword) {
      setError("Please select a city and enter a keyword")
      return
    }

    setIsLoading(true)

    // Here we would pass the postcode_area to the scraper
    console.log(`Selected postcode area: ${selectedCity.postcode_area} for keyword: ${keyword}`)

    // Simulate API call/processing
    setTimeout(() => {
      router.push("/results")
    }, 1500)
  }

  return (
    <MainLayout activePage="home">
      <div className="home-container">
        <div className="scraper-form">
          <Title level={2}>GMB Scraper</Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError("")}
              className="error-alert"
            />
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="city">City</label>
              <Select
                showSearch
                id="city"
                value={selectedCity ? selectedCity.area_covered : undefined}
                placeholder="Search for a city"
                defaultActiveFirstOption={false}
                showArrow={false}
                filterOption={false}
                onSearch={handleCitySearch}
                onChange={(value) => {
                  const city = cities.find((c) => c.area_covered === value)
                  setSelectedCity(city)
                }}
                notFoundContent={isSearchingCities ? <Spin size="small" /> : "No cities found"}
                style={{ width: "100%" }}
              >
                {cities.map((city) => (
                  <Option key={city._id} value={city.area_covered}>
                    {city.area_covered} ({city.postcode_area})
                  </Option>
                ))}
              </Select>
            </div>

            <div className="form-group">
              <label htmlFor="keyword">Keyword</label>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword (e.g. restaurants)"
              />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={!selectedCity || !keyword}
              className="submit-button"
            >
              Start Scraper
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
