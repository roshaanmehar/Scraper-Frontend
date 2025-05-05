import AppLayout from "../components/layout/AppLayout"
import HomePage from "../components/HomePage"

export default function Home() {
  return (
    <AppLayout activeTab="home">
      <HomePage />
    </AppLayout>
  )
}
