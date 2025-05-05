import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

export async function GET() {
  try {
    // Connect to MongoDB
    const client = new MongoClient(MONGO_URI)
    await client.connect()

    // Get database stats
    const db = client.db("Leeds") // Using Leeds as the default database
    const restaurantsCollection = db.collection("restaurants")
    const subsectorQueueCollection = db.collection("subsector_queue")

    // Get total businesses
    const totalBusinesses = await restaurantsCollection.countDocuments()

    // Get businesses with websites
    const businessesWithWebsites = await restaurantsCollection.countDocuments({
      website: { $exists: true, $ne: "N/A" },
    })

    // Get businesses with emails
    const businessesWithEmails = await restaurantsCollection.countDocuments({
      emailstatus: "found",
    })

    // Get businesses checked but no email found
    const businessesCheckedNoEmail = await restaurantsCollection.countDocuments({
      emailstatus: "checked",
    })

    // Get businesses that failed processing
    const businessesFailed = await restaurantsCollection.countDocuments({
      emailstatus: "failed",
    })

    // Get businesses pending email
    const businessesPendingEmail = await restaurantsCollection.countDocuments({
      emailstatus: "pending",
    })

    // Get total postcodes (from subsector_queue)
    const subsectorStats = await subsectorQueueCollection
      .aggregate([
        {
          $group: {
            _id: null,
            totalPostcodes: { $sum: "$totalrecordsfound" },
          },
        },
      ])
      .toArray()

    const totalPostcodes = subsectorStats.length > 0 ? subsectorStats[0].totalPostcodes : 0

    // Get social media profiles
    const socialProfilesAgg = await restaurantsCollection
      .aggregate([
        {
          $match: {
            social_profiles: { $exists: true, $ne: {} },
          },
        },
        {
          $project: {
            hasFacebook: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.facebook", ""] } }, 0] }, 1, 0] },
            hasTwitter: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.twitter", ""] } }, 0] }, 1, 0] },
            hasInstagram: {
              $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.instagram", ""] } }, 0] }, 1, 0],
            },
            hasLinkedin: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.linkedin", ""] } }, 0] }, 1, 0] },
            hasOther: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.youtube", ""] } }, 0] },
                    { $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.pinterest", ""] } }, 0] },
                    { $gt: [{ $strLenCP: { $ifNull: ["$social_profiles.tiktok", ""] } }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            facebook: { $sum: "$hasFacebook" },
            twitter: { $sum: "$hasTwitter" },
            instagram: { $sum: "$hasInstagram" },
            linkedin: { $sum: "$hasLinkedin" },
            other: { $sum: "$hasOther" },
            total: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const socialProfiles =
      socialProfilesAgg.length > 0
        ? {
            facebook: socialProfilesAgg[0].facebook,
            twitter: socialProfilesAgg[0].twitter,
            instagram: socialProfilesAgg[0].instagram,
            linkedin: socialProfilesAgg[0].linkedin,
            other: socialProfilesAgg[0].other,
          }
        : {
            facebook: 0,
            twitter: 0,
            instagram: 0,
            linkedin: 0,
            other: 0,
          }

    const totalSocialProfiles = socialProfilesAgg.length > 0 ? socialProfilesAgg[0].total : 0

    // Get top subsectors
    const topSubsectorsAgg = await restaurantsCollection
      .aggregate([
        {
          $group: {
            _id: "$subsector",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
      ])
      .toArray()

    // Calculate percentages for top subsectors
    const topSubsectors = topSubsectorsAgg.map((subsector) => ({
      name: subsector._id,
      count: subsector.count,
      percentage: Math.round((subsector.count / totalBusinesses) * 100),
    }))

    // Close MongoDB connection
    await client.close()

    return NextResponse.json({
      totalBusinesses,
      businessesWithWebsites,
      businessesWithEmails,
      businessesCheckedNoEmail,
      businessesFailed,
      businessesPendingEmail,
      totalPostcodes,
      totalSocialProfiles,
      socialProfiles,
      topSubsectors,
    })
  } catch (error) {
    console.error("Error getting dashboard stats:", error)
    return NextResponse.json({ error: "Failed to get dashboard statistics" }, { status: 500 })
  }
}
