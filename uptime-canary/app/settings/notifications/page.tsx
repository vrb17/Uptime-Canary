"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface NotificationPreference {
  id: string
  channel: string
  address: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPreference, setEditingPreference] = useState<NotificationPreference | null>(null)
  const [formData, setFormData] = useState({
    channel: "email",
    address: "",
  })
  const [editFormData, setEditFormData] = useState({
    channel: "email",
    address: "",
    enabled: true,
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load notification preferences",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (status === "authenticated") {
      loadPreferences()
    }
  }, [status, loadPreferences])

  const handleAddPreference = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newPreference = await response.json()
        setPreferences([newPreference, ...preferences])
        setFormData({ channel: "email", address: "" })
        setIsAddDialogOpen(false)
        toast({
          title: "Success",
          description: "Notification preference added successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add notification preference",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add notification preference",
        variant: "destructive",
      })
    }
  }

  const handleEditPreference = async () => {
    if (!editingPreference) return

    try {
      const response = await fetch(`/api/notifications/${editingPreference.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      })

      if (response.ok) {
        const updatedPreference = await response.json()
        setPreferences(preferences.map(p => 
          p.id === editingPreference.id ? updatedPreference : p
        ))
        setEditingPreference(null)
        setIsEditDialogOpen(false)
        toast({
          title: "Success",
          description: "Notification preference updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update notification preference",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification preference",
        variant: "destructive",
      })
    }
  }

  const handleDeletePreference = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setPreferences(preferences.filter(p => p.id !== id))
        toast({
          title: "Success",
          description: "Notification preference deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete notification preference",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification preference",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (preference: NotificationPreference) => {
    setEditingPreference(preference)
    setEditFormData({
      channel: preference.channel,
      address: preference.address,
      enabled: preference.enabled,
    })
    setIsEditDialogOpen(true)
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Manage how you receive alerts when your checks go down
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Preference
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Notification Preference</DialogTitle>
                <DialogDescription>
                  Add a new way to receive notifications when your checks fail.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Email Address</Label>
                  <Input
                    id="address"
                    type="email"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPreference}>Add Preference</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {preferences.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notification preferences</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven&apos;t set up any notification preferences yet. Add one to receive alerts when your checks go down.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Preference
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {preferences.map((preference) => (
              <Card key={preference.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <Badge variant="outline">{preference.channel}</Badge>
                      </div>
                      <div>
                        <p className="font-medium">{preference.address}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(preference.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={preference.enabled ? "default" : "secondary"}>
                        {preference.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(preference)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Notification Preference</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this notification preference? 
                              You will no longer receive alerts at {preference.address}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePreference(preference.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notification Preference</DialogTitle>
              <DialogDescription>
                Update your notification preference settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-channel">Channel</Label>
                <Select
                  value={editFormData.channel}
                  onValueChange={(value) => setEditFormData({ ...editFormData, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-address">Email Address</Label>
                <Input
                  id="edit-address"
                  type="email"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-enabled"
                  checked={editFormData.enabled}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, enabled: checked })}
                />
                <Label htmlFor="edit-enabled">Enable notifications</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditPreference}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
