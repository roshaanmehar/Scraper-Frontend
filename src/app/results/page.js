"use client"

import { useState, useEffect } from "react"
import { Table, Input, Button, Select, Alert, Typography, Card } from "antd"
import MainLayout from "../../components/MainLayout"
import "./results.css"

const { Title, Text } = Typography
const { Option } = Select
const { Search } = Input

export default function ResultsPage() {
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState("restaurants")
  const [businesses, setBusinesses] = useState([])
  const [stats, setStats] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections()
  }, [])

  // Fetch businesses when collection changes
  useEffect(() => {
    if (selectedCollection) {
      fetchBusinesses()
    }
  }, [selectedCollection, pagination.current, searchTerm])

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/collections")
      const data = await response.json()

      if (data.collections && data.collections.length > 0) {
        const filteredCollections = data.collections.filter((collection) => collection !== "subsector_queue")
        setCollections(filteredCollections)

        // Set restaurants as default if it exists
        if (filteredCollections.includes("restaurants")) {
          setSelectedCollection("restaurants")
        } else if (filteredCollections.length > 0) {
          setSelectedCollection(filteredCollections[0])
        }
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err)
      setError("Failed to fetch collections")
      setCollections(["restaurants"]) // Fallback
      setSelectedCollection("restaurants")
    }
  }

  const fetchBusinesses = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/businesses/${selectedCollection}?page=${pagination.current}&search=${encodeURIComponent(searchTerm)}`,
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        setBusinesses(data.data)
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
        }))
        setStats(data.stats)
      }
    } catch (err) {
      console.error("Error fetching business data:", err)
      setError(`Failed to fetch business data: ${err.message || String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleTableChange = (pagination) => {
    setPagination(pagination)
  }

  const handleExportCSV = () => {
    alert("Export functionality would be implemented here")
  }

  const columns = [
    {
      title: "Business",
      dataIndex: "businessname",
      key: "businessname",
      render: (text, record) => (
        <div>
          <div className="business-name">{text || "Unnamed Business"}</div>
          {record.stars && (
            <div className="business-rating">
              <span className="stars">⭐ {record.stars}</span>
              {record.numberofreviews && <span className="review-count">({record.numberofreviews} reviews)</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      key: "contact",
      render: (_, record) => (
        <div>
          {record.address && <div className="business-address">📍 {record.address}</div>}
          {record.phonenumber && <div className="business-phone">📞 {record.phonenumber}</div>}
          {record.website && record.website !== "N/A" && (
            <div className="business-website">
              <a href={record.website} target="_blank" rel="noopener noreferrer">
                🌐 {truncateUrl(record.website)}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => {
        const emails = getValidEmails(email)
        return (
          <div className="email-list">
            {emails.map((email, index) => (
              <a key={index} href={`mailto:${email}`} className="email-item">
                ✉️ {email}
              </a>
            ))}
          </div>
        )
      },
    },
  ]

  // Check if email is valid (not empty and not "N/A")
  const isValidEmail = (email) => {
    if (!email) return false

    if (Array.isArray(email)) {
      return email.length > 0 && email.some((e) => e && e !== "N/A")
    }

    return email !== "N/A" && email !== ""
  }

  // Get valid emails from email field
  const getValidEmails = (email) => {
    if (!email) return []

    if (Array.isArray(email)) {
      return email.filter((e) => e && e !== "N/A")
    }

    return email !== "N/A" && email !== "" ? [email] : []
  }

  // Truncate long URLs
  const truncateUrl = (url, maxLength = 30) => {
    if (!url) return ""
    const cleanUrl = url.replace(/^https?:\/\//, "")
    return cleanUrl.length > maxLength ? cleanUrl.substring(0, maxLength) + "..." : cleanUrl
  }

  return (
    <MainLayout activePage="results">
      <div className="results-container">
        <div className="results-header">
          <Title level={2}>Businesses with Email</Title>

          <div className="results-actions">
            <Search
              placeholder="Search businesses..."
              allowClear
              enterButton="Search"
              onSearch={handleSearch}
              style={{ width: 300 }}
            />

            <Button type="primary" onClick={handleExportCSV} disabled={isLoading || businesses.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="collection-selector">
          <span>Collection:</span>
          <Select
            value={selectedCollection}
            onChange={setSelectedCollection}
            loading={collections.length === 0}
            style={{ width: 200 }}
          >
            {collections.map((collection) => (
              <Option key={collection} value={collection}>
                {collection}
              </Option>
            ))}
          </Select>
        </div>

        {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: "1rem" }} />}

        {stats && (
          <div className="stats-container">
            <Card size="small">
              <div className="stats-grid">
                <div className="stat-item">
                  <Text type="secondary">Total Records</Text>
                  <Text strong>{stats.totalRecords}</Text>
                </div>
                <div className="stat-item">
                  <Text type="secondary">Records with Email</Text>
                  <Text strong>{stats.recordsWithEmail}</Text>
                </div>
                <div className="stat-item">
                  <Text type="secondary">Records with Website</Text>
                  <Text strong>{stats.recordsWithWebsite}</Text>
                </div>
                <div className="stat-item">
                  <Text type="secondary">Unique Subsectors</Text>
                  <Text strong>{stats.uniqueSubsectors}</Text>
                </div>
                <div className="stat-item">
                  <Text type="secondary">Avg Rating</Text>
                  <Text strong>⭐ {stats.avgStars}</Text>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={businesses}
          rowKey={(record) => record._id || Math.random().toString(36).substr(2, 9)}
          pagination={pagination}
          onChange={handleTableChange}
          loading={isLoading}
          locale={{
            emptyText: "No businesses found with valid email addresses",
          }}
        />
      </div>
    </MainLayout>
  )
}
