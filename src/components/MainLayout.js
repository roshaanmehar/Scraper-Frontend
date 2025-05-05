"use client"

import { useState } from "react"
import { Layout, Menu, ConfigProvider, theme } from "antd"
import Link from "next/link"
import "antd/dist/reset.css"
import "./MainLayout.css"

const { Header, Content, Footer } = Layout

export default function MainLayout({ children, activePage = "home" }) {
  const [darkMode, setDarkMode] = useState(false)

  const toggleTheme = () => {
    setDarkMode(!darkMode)
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Layout className="main-layout">
        <Header className="header">
          <div className="logo">GMB Scraper</div>
          <Menu
            mode="horizontal"
            selectedKeys={[activePage]}
            items={[
              {
                key: "home",
                label: <Link href="/">Scraper</Link>,
              },
              {
                key: "results",
                label: <Link href="/results">Results</Link>,
              },
            ]}
          />
          <div className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? "☀️" : "🌙"}
          </div>
        </Header>
        <Content className="content">{children}</Content>
        <Footer className="footer">GMB Scraper ©{new Date().getFullYear()} Created with Next.js and Ant Design</Footer>
      </Layout>
    </ConfigProvider>
  )
}
