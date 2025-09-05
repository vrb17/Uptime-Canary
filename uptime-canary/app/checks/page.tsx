"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

// API Types
interface Check {
  id: string
  name: string
  url: string
  method: "GET" | "HEAD" | "POST"
  expectedStatus: number
  intervalSeconds: number
  timeoutMs: number
  enabled: boolean
  lastStatus: "UNKNOWN" | "UP" | "DOWN"
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

interface CreateCheckData {
  name: string
  url: string
  method: "GET" | "HEAD" | "POST"
  intervalSec: number
  timeoutMs: number
  expectedCode?: number
  enabled?: boolean
}

interface UpdateCheckData {
  name?: string
  url?: string
  method?: "GET" | "HEAD" | "POST"
  intervalSec?: number
  timeoutMs?: number
  expectedCode?: number
  enabled?: boolean
}

// API Functions
async function fetchChecks(): Promise<Check[]> {
  const response = await fetch("/api/checks")
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED")
    }
    throw new Error("Failed to fetch checks")
  }
  return response.json()
}

async function createCheck(data: CreateCheckData): Promise<Check> {
  const response = await fetch("/api/checks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED")
    }
    const error = await response.json()
    throw new Error(error.error || "Failed to create check")
  }
  return response.json()
}

async function updateCheck(id: string, data: UpdateCheckData): Promise<Check> {
  const response = await fetch(`/api/checks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED")
    }
    const error = await response.json()
    throw new Error(error.error || "Failed to update check")
  }
  return response.json()
}

async function deleteCheck(id: string): Promise<void> {
  const response = await fetch(`/api/checks/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED")
    }
    const error = await response.json()
    throw new Error(error.error || "Failed to delete check")
  }
}

// Utility Functions
function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

function formatLastCheck(lastCheckedAt: string | null): string {
  if (!lastCheckedAt) return "Never"
  const date = new Date(lastCheckedAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minutes ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} days ago`
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export default function ChecksPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCheck, setEditingCheck] = useState<Check | null>(null)
  const [deletingCheck, setDeletingCheck] = useState<Check | null>(null)
  const [pending, setPending] = useState(false)
  
  const [formData, setFormData] = useState<CreateCheckData>({
    name: "",
    url: "",
    method: "GET",
    intervalSec: 60,
    timeoutMs: 10000,
    expectedCode: 200,
    enabled: true,
  })

  // Load checks on mount
  const loadChecks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchChecks()
      setChecks(data)
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        router.push("/login")
        return
      }
      toast({
        title: "Error",
        description: "Failed to load checks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    loadChecks()
  }, [loadChecks])

  async function handleAddCheck() {
    if (!validateUrl(formData.url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      })
      return
    }

    try {
      setPending(true)
      const newCheck = await createCheck(formData)
      setChecks([newCheck, ...checks])
      setIsAddDialogOpen(false)
      resetForm()
      toast({
        title: "Success",
        description: "Check created successfully",
      })
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        router.push("/login")
        return
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create check",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleEditCheck() {
    if (!editingCheck) return
    
    if (formData.url && !validateUrl(formData.url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      })
      return
    }

    try {
      setPending(true)
      const updatedCheck = await updateCheck(editingCheck.id, formData)
      setChecks(checks.map(check => check.id === editingCheck.id ? updatedCheck : check))
      setIsEditDialogOpen(false)
      setEditingCheck(null)
      resetForm()
      toast({
        title: "Success",
        description: "Check updated successfully",
      })
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        router.push("/login")
        return
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update check",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDeleteCheck() {
    if (!deletingCheck) return

    try {
      setPending(true)
      await deleteCheck(deletingCheck.id)
      setChecks(checks.filter(check => check.id !== deletingCheck.id))
      setIsDeleteDialogOpen(false)
      setDeletingCheck(null)
      toast({
        title: "Success",
        description: "Check deleted successfully",
      })
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        router.push("/login")
        return
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete check",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  function openEditDialog(check: Check) {
    setEditingCheck(check)
    setFormData({
      name: check.name,
      url: check.url,
      method: check.method,
      intervalSec: check.intervalSeconds,
      timeoutMs: check.timeoutMs,
      expectedCode: check.expectedStatus,
      enabled: check.enabled,
    })
    setIsEditDialogOpen(true)
  }

  function openDeleteDialog(check: Check) {
    setDeletingCheck(check)
    setIsDeleteDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      url: "",
      method: "GET",
      intervalSec: 60,
      timeoutMs: 10000,
      expectedCode: 200,
      enabled: true,
    })
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">UC</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Uptime Canary</h1>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/checks" className="text-primary font-medium">
                  Checks
                </Link>
                <Link href="/alerts" className="text-muted-foreground hover:text-foreground">
                  Alerts
                </Link>
                <Link href="/status" className="text-muted-foreground hover:text-foreground">
                  Status Pages
                </Link>
                <Link href="/settings/notifications" className="text-muted-foreground hover:text-foreground">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Add Check</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Check</DialogTitle>
                    <DialogDescription>Create a new uptime monitor for your website or API.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="My Website"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        placeholder="https://example.com"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="method">HTTP Method</Label>
                      <Select
                        value={formData.method}
                        onValueChange={(value: "GET" | "HEAD" | "POST") => setFormData({ ...formData, method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="HEAD">HEAD</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="interval">Check Interval</Label>
                      <Select
                        value={formData.intervalSec.toString()}
                        onValueChange={(value) => setFormData({ ...formData, intervalSec: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">Every 30 seconds</SelectItem>
                          <SelectItem value="60">Every 1 minute</SelectItem>
                          <SelectItem value="300">Every 5 minutes</SelectItem>
                          <SelectItem value="900">Every 15 minutes</SelectItem>
                          <SelectItem value="1800">Every 30 minutes</SelectItem>
                          <SelectItem value="3600">Every hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="timeout">Timeout (ms)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          min="1000"
                          max="30000"
                          value={formData.timeoutMs}
                          onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="expectedStatus">Expected Status</Label>
                        <Input
                          id="expectedStatus"
                          type="number"
                          value={formData.expectedCode}
                          onChange={(e) => setFormData({ ...formData, expectedCode: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                      />
                      <Label htmlFor="enabled">Enabled</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={pending}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCheck} disabled={pending || !formData.name || !formData.url}>
                      {pending ? "Creating..." : "Add Check"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session?.user?.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8" id="main">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Your Checks</h2>
            <p className="text-muted-foreground">Manage your uptime monitoring checks</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{checks.length} total checks</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Checks List */}
        {!loading && checks.length > 0 && (
          <div className="grid gap-6">
            {checks.map((check) => (
              <Card key={check.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-4 w-4 rounded-full ${
                          check.lastStatus === "UP"
                            ? "bg-green-500"
                            : check.lastStatus === "DOWN"
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                      ></div>
                      <div>
                        <h3 className="text-lg font-semibold">{check.name}</h3>
                        <p className="text-sm text-muted-foreground">{check.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">{formatInterval(check.intervalSeconds)}</p>
                        <p className="text-xs text-muted-foreground">interval</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{check.timeoutMs}ms</p>
                        <p className="text-xs text-muted-foreground">timeout</p>
                      </div>
                      <Badge
                        variant={
                          check.lastStatus === "UP" ? "default" : check.lastStatus === "DOWN" ? "destructive" : "secondary"
                        }
                      >
                        {check.lastStatus.toLowerCase()}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="More options">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(check)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(check)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Last checked: {formatLastCheck(check.lastCheckedAt)}</span>
                    <span>•</span>
                    <span>Method: {check.method}</span>
                    <span>•</span>
                    <span>Expected: {check.expectedStatus}</span>
                    <span>•</span>
                    <span>Status: {check.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && checks.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No checks yet</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first uptime check.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>Add Your First Check</Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Check</DialogTitle>
            <DialogDescription>Update your uptime monitor settings.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-method">HTTP Method</Label>
              <Select
                value={formData.method}
                onValueChange={(value: "GET" | "HEAD" | "POST") => setFormData({ ...formData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="HEAD">HEAD</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-interval">Check Interval</Label>
              <Select
                value={formData.intervalSec.toString()}
                onValueChange={(value) => setFormData({ ...formData, intervalSec: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every 1 minute</SelectItem>
                  <SelectItem value="300">Every 5 minutes</SelectItem>
                  <SelectItem value="900">Every 15 minutes</SelectItem>
                  <SelectItem value="1800">Every 30 minutes</SelectItem>
                  <SelectItem value="3600">Every hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-timeout">Timeout (ms)</Label>
                <Input
                  id="edit-timeout"
                  type="number"
                  min="1000"
                  max="30000"
                  value={formData.timeoutMs}
                  onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-expectedStatus">Expected Status</Label>
                <Input
                  id="edit-expectedStatus"
                  type="number"
                  value={formData.expectedCode}
                  onChange={(e) => setFormData({ ...formData, expectedCode: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="edit-enabled">Enabled</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleEditCheck} disabled={pending || !formData.name || !formData.url}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the check &quot;{deletingCheck?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCheck} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
