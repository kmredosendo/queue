'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserRole, LaneType } from '@prisma/client'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  assignedLanes?: {
    lane: {
      id: number
      name: string
    }
  }[]
}

interface Lane {
  id: number
  name: string
  description?: string
  type: LaneType
  isActive: boolean
  currentNumber: number
  lastServedNumber: number
  assignedUsers: {
    user: {
      id: number
      username: string
      name: string
      role: UserRole
    }
  }[]
}

export default function AdminDashboard() {
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [lanes, setLanes] = useState<Lane[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // User form state
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: UserRole.USER as UserRole
  })

  // Lane form state
  const [showLaneDialog, setShowLaneDialog] = useState(false)
  const [editingLane, setEditingLane] = useState<Lane | null>(null)
  const [laneForm, setLaneForm] = useState({
    name: '',
    description: '',
    type: LaneType.REGULAR as LaneType
  })

  // Staff assignment state
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        setIsAuthenticated(true)
        loadData()
      } else {
        // Redirect to main login page
        window.location.href = '/'
      }
    } catch {
      // Redirect to main login page
      window.location.href = '/'
    } finally {
      setAuthLoading(false)
    }
  }, [])

  // Load data
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logged out successfully')
      window.location.href = '/'
    } catch (err) {
      console.error('Logout error:', err)
      toast.error('Logout failed, redirecting anyway...')
      window.location.href = '/'
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersResponse, lanesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/lanes')
      ])

      if (!usersResponse.ok || !lanesResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const usersData = await usersResponse.json()
      const lanesData = await lanesResponse.json()

      setUsers(usersData)
      setLanes(lanesData)
    } catch (err) {
      toast.error('Failed to load data. Please try refreshing the page.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // User management functions
  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      setShowUserDialog(false)
      resetUserForm()
      loadData()
      toast.success('User created successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
      toast.error(errorMessage)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userForm.name,
          role: userForm.role,
          password: userForm.password || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      setShowUserDialog(false)
      setEditingUser(null)
      resetUserForm()
      loadData()
      toast.success('User updated successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
      toast.error(errorMessage)
    }
  }

  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      loadData()
    } catch (error) {
      toast.error('Failed to update user status')
      console.error('Toggle user status error:', error)
    }
  }

  const resetUserForm = () => {
    setUserForm({
      username: '',
      password: '',
      name: '',
      role: UserRole.USER as UserRole
    })
  }

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role
      })
    } else {
      setEditingUser(null)
      resetUserForm()
    }
    setShowUserDialog(true)
  }

  // Lane management functions
  const handleCreateLane = async () => {
    try {
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(laneForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create lane')
      }

      setShowLaneDialog(false)
      resetLaneForm()
      loadData()
      toast.success('Lane created successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create lane'
      toast.error(errorMessage)
    }
  }

  const handleUpdateLane = async () => {
    if (!editingLane) return

    try {
      const response = await fetch(`/api/lanes/${editingLane.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(laneForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update lane')
      }

      setShowLaneDialog(false)
      setEditingLane(null)
      resetLaneForm()
      loadData()
      toast.success('Lane updated successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update lane'
      toast.error(errorMessage)
    }
  }

  const handleToggleLaneStatus = async (laneId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/lanes/${laneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (!response.ok) {
        throw new Error('Failed to update lane status')
      }

      loadData()
    } catch (error) {
      toast.error('Failed to update lane status')
      console.error('Toggle lane status error:', error)
    }
  }

  const resetLaneForm = () => {
    setLaneForm({
      name: '',
      description: '',
      type: LaneType.REGULAR as LaneType
    })
  }

  const openLaneDialog = (lane?: Lane) => {
    if (lane) {
      setEditingLane(lane)
      setLaneForm({
        name: lane.name,
        description: lane.description || '',
        type: lane.type
      })
    } else {
      setEditingLane(null)
      resetLaneForm()
    }
    setShowLaneDialog(true)
  }

  // Staff assignment functions
  const handleAssignStaff = async () => {
    if (!selectedLane || !selectedUserId) return

    try {
      const response = await fetch(`/api/lanes/${selectedLane.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign staff')
      }

      setShowAssignDialog(false)
      setSelectedLane(null)
      setSelectedUserId(null)
      loadData()
      toast.success('Staff assigned successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign staff'
      toast.error(errorMessage)
    }
  }

  const handleUnassignStaff = async (laneId: number, userId: number) => {
    try {
      const response = await fetch(`/api/lanes/${laneId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to unassign staff')
      }

      toast.success('Staff member unassigned successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to unassign staff')
      console.error('Unassign staff error:', error)
    }
  }

  const openAssignDialog = (lane: Lane) => {
    setSelectedLane(lane)
    setSelectedUserId(null)
    setShowAssignDialog(true)
  }

  // Get available staff (USER role only, not already assigned to the lane)
  const getAvailableStaff = () => {
    if (!selectedLane) return []
    
    const assignedUserIds = selectedLane.assignedUsers.map(au => au.user.id)
    return users.filter(user => 
      user.role === UserRole.USER && 
      user.isActive && 
      !assignedUserIds.includes(user.id)
    )
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Checking authentication...</div>
      </div>
    )
  }

  // If not authenticated, user will be redirected to login page
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Redirecting to login...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Refresh</Button>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users Management</CardTitle>
              <CardDescription>Manage system users and their roles</CardDescription>
            </div>
            <Button onClick={() => openUserDialog()}>Add User</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Lanes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === UserRole.ADMIN ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.assignedLanes?.map(al => al.lane.name).join(', ') || 'None'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUserDialog(user)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant={user.isActive ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lanes Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lanes Management</CardTitle>
              <CardDescription>Manage service lanes and staff assignments</CardDescription>
            </div>
            <Button onClick={() => openLaneDialog()}>Add Lane</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Number</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lanes.map((lane) => (
                <TableRow key={lane.id}>
                  <TableCell className="font-medium">{lane.name}</TableCell>
                  <TableCell>
                    <Badge variant={lane.type === LaneType.PWD_SENIOR ? 'secondary' : 'outline'}>
                      {lane.type === LaneType.PWD_SENIOR ? 'PWD/Senior' : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell>{lane.description || 'No description'}</TableCell>
                  <TableCell>
                    <Badge variant={lane.isActive ? 'default' : 'destructive'}>
                      {lane.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{lane.currentNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {lane.assignedUsers.map(au => (
                        <div key={au.user.id} className="flex items-center gap-2">
                          <span className="text-sm">{au.user.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignStaff(lane.id, au.user.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      )) || 'No staff assigned'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openLaneDialog(lane)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAssignDialog(lane)}
                      >
                        Assign Staff
                      </Button>
                      <Button 
                        variant={lane.isActive ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleToggleLaneStatus(lane.id, lane.isActive)}
                      >
                        {lane.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={userForm.username}
                onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={userForm.name}
                onChange={(e) => setUserForm({...userForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value as UserRole})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.USER}>User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lane Dialog */}
      <Dialog open={showLaneDialog} onOpenChange={setShowLaneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLane ? 'Edit Lane' : 'Add Lane'}</DialogTitle>
            <DialogDescription>
              {editingLane ? 'Update lane information' : 'Create a new service lane'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lane-name">Name</Label>
              <Input
                id="lane-name"
                value={laneForm.name}
                onChange={(e) => setLaneForm({...laneForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lane-type">Type</Label>
              <Select value={laneForm.type} onValueChange={(value) => setLaneForm({...laneForm, type: value as LaneType})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LaneType.REGULAR}>Regular</SelectItem>
                  <SelectItem value={LaneType.PWD_SENIOR}>PWD/Senior Citizens</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lane-description">Description</Label>
              <Input
                id="lane-description"
                value={laneForm.description}
                onChange={(e) => setLaneForm({...laneForm, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLaneDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingLane ? handleUpdateLane : handleCreateLane}>
                {editingLane ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff to {selectedLane?.name}</DialogTitle>
            <DialogDescription>
              Select a staff member to assign to this lane
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-select">Available Staff</Label>
              <Select 
                value={selectedUserId?.toString() || ''} 
                onValueChange={(value) => setSelectedUserId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStaff().map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignStaff} disabled={!selectedUserId}>
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
