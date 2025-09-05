"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { toast } = useToast()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
    
    toast({
      title: "Error",
      description: "Failed to load dashboard data. Please try again.",
      variant: "destructive",
    })
  }, [error, toast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live status and last 24h performance</p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-medium">Something went wrong!</h2>
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading your dashboard data.
            </p>
            <Button onClick={reset} variant="outline">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
