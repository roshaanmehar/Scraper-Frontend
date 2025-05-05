import AppLayout from "../../components/layout/AppLayout"

export default function ResultsPage() {
  return (
    <AppLayout activeTab="results">
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "2rem" }}>Search Results</h1>

        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <p>No results to display yet. Please run a search from the home page.</p>
        </div>
      </div>
    </AppLayout>
  )
}
