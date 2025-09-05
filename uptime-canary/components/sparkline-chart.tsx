"use client"

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"

interface SparklineData {
  t: Date
  ms: number
}

interface SparklineChartProps {
  data: SparklineData[]
  className?: string
}

export function SparklineChart({ data, className }: SparklineChartProps) {
  if (data.length === 0) {
    return (
      <div className={`h-16 flex items-center justify-center text-xs text-muted-foreground ${className}`}>
        No data
      </div>
    )
  }

  // Transform data for Recharts
  const chartData = data.map((item, index) => ({
    name: index,
    value: item.ms,
    time: item.t
  }))

  return (
    <div className={`h-16 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 2, fill: "hsl(var(--primary))" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-background border border-border rounded-md p-2 text-xs">
                    <p className="font-medium">{data.value}ms</p>
                    <p className="text-muted-foreground">
                      {new Date(data.time).toLocaleTimeString()}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
