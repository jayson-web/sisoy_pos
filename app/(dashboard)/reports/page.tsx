"use client"

import { useState, useEffect } from "react"
import { storage, type Booking } from "@/lib/storage"

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    setBookings(storage.getBookings())
  }, [])

  const getFilteredBookings = () => {
    return bookings.filter((b) => {
      const date = b.dateFrom
      return date >= dateRange.start && date <= dateRange.end && b.status !== "cancelled"
    })
  }

  const calculateStats = () => {
    const filtered = getFilteredBookings()
    const totalBookings = filtered.length
    const totalRevenue = filtered.filter((b) => b.paymentStatus === "paid").reduce((sum, b) => sum + b.totalAmount, 0)
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

    return { totalBookings, totalRevenue, avgBookingValue }
  }

  const getDailySalesData = () => {
    const filtered = getFilteredBookings()
    const dailyData: { [key: string]: number } = {}

    filtered.forEach((b) => {
      if (!dailyData[b.dateFrom]) {
        dailyData[b.dateFrom] = 0
      }
      dailyData[b.dateFrom] += b.totalAmount
    })

    return Object.entries(dailyData)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-7)
  }

  const getAccommodationBreakdown = () => {
    const filtered = getFilteredBookings()
    const breakdown: { [key: string]: { count: number; revenue: number } } = {}

    filtered.forEach((b) => {
      const acc = storage.getAccommodations().find((a) => a.id === b.accommodationId)
      if (acc) {
        if (!breakdown[acc.name]) {
          breakdown[acc.name] = { count: 0, revenue: 0 }
        }
        breakdown[acc.name].count++
        breakdown[acc.name].revenue += b.totalAmount
      }
    })

    return breakdown
  }

  const stats = calculateStats()
  const dailySales = getDailySalesData()
  const accommodationBreakdown = getAccommodationBreakdown()

  const handleExportCSV = () => {
    const filtered = getFilteredBookings()
    const csv = [
      ["Date", "Customer", "Accommodation", "Amount", "Status"],
      ...filtered.map((b) => {
        const client = storage.getClients().find((c) => c.id === b.clientId)
        const acc = storage.getAccommodations().find((a) => a.id === b.accommodationId)
        const customerName = (b as any).customerName || `${client?.firstName || ''} ${client?.lastName || ''}`.trim()
        return [b.dateFrom, customerName, acc?.name, b.totalAmount, b.status]
      }),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-${dateRange.start}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-(--primary-blue)">Reports</h1>

      {/* Date Range Filter */}
      <div className="bg-white border border-(--gray-light) rounded p-4 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-bold text-(--gray-dark) mb-1">From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-(--gray-light) rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-(--gray-dark) mb-1">To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-(--gray-light) rounded"
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-(--yellow) text-(--gray-dark) rounded font-bold hover:bg-yellow-400"
        >
          Export CSV
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-(--gray-light) rounded p-6">
          <p className="text-sm text-(--gray-dark) mb-1">Total Bookings</p>
          <p className="text-3xl font-bold text-(--primary-blue)">{stats.totalBookings}</p>
        </div>
        <div className="bg-white border border-(--gray-light) rounded p-6">
          <p className="text-sm text-(--gray-dark) mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-(--primary-blue)">₱{stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-(--gray-light) rounded p-6">
          <p className="text-sm text-(--gray-dark) mb-1">Avg. Booking Value</p>
          <p className="text-3xl font-bold text-(--primary-blue)">
            ₱{Math.round(stats.avgBookingValue).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Daily Sales */}
      <div className="bg-white border border-(--gray-light) rounded p-6">
        <h2 className="text-lg font-bold text-(--gray-dark) mb-4">Last 7 Days Sales</h2>
        <div className="space-y-2">
          {dailySales.map(([date, amount]) => (
            <div key={date} className="flex items-center gap-4">
              <span className="w-24 text-sm font-bold">{date}</span>
              <div className="flex-1 bg-(--gray-bg) rounded h-8 relative overflow-hidden">
                <div
                  className="bg-(--yellow) h-full transition-all absolute left-0 top-0"
                  style={{
                    width: `${Math.min(100, (amount / Math.max(...dailySales.map((d) => d[1]))) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-32 text-right font-bold relative z-10">₱{amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accommodation Breakdown */}
      <div className="bg-white border border-(--gray-light) rounded p-6">
        <h2 className="text-lg font-bold text-(--gray-dark) mb-4">Accommodation Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-(--gray-bg) border-b border-(--gray-light)">
              <tr>
                <th className="text-left py-2 px-4 font-bold">Accommodation</th>
                <th className="text-left py-2 px-4 font-bold">Bookings</th>
                <th className="text-left py-2 px-4 font-bold">Revenue</th>
                <th className="text-left py-2 px-4 font-bold">Avg/Booking</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(accommodationBreakdown).map(([name, data]) => (
                <tr key={name} className="border-b border-(--gray-light)">
                  <td className="py-3 px-4">{name}</td>
                  <td className="py-3 px-4 font-bold">{data.count}</td>
                  <td className="py-3 px-4 font-bold">₱{data.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4">₱{Math.round(data.revenue / data.count).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
