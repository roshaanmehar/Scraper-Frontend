import type { ObjectId } from "mongodb"

export interface Restaurant {
  _id: ObjectId
  phonenumber?: number
  address?: string
  businessname: string
  email?: string[]
  emailstatus?: string
  numberofreviews?: number
  scraped_at?: Date
  stars?: string
  subsector?: string
  website?: string
  emailscraped_at?: Date
}

export interface RestaurantQueryParams {
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
}
