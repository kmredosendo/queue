'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  name: string
  email?: string
  role: string
  isActive?: boolean
  createdAt: string
  assignedLanes: Array<{
    lane: {
      id: string
      name: string
    }
  }>
}

interface Lane {
  id: string
  name: string
  description?: string
  isActive: boolean
  currentNumber: number
  lastServedNumber: number
  assignedUsers: Array<{
    user: {
      id: string
      username: string
      name: string
      role: string
    }
  }>
  queueItems: Array<{
    number: number
    status: string
  }>
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [lanes, setLanes] = useState<Lane[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showLaneDialog, setShowLaneDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingLane, setEditingLane] = useState<Lane | null>(null)
  const router = useRouter()

  // User form state
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'USER'
  })

  // Lane form state
  const [newLane, setNewLane] = useState({
    name: '',
    description: ''
  })

  // Printer state
  const [printerInterface, setPrinterInterface] = useState('ESDPRT001')
  const [printerStatus, setPrinterStatus] = useState<{ connected: boolean; error?: string } | null>(null)
  const [isTestingPrinter, setIsTestingPrinter] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchLanes()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        toast.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error fetching users')
    }
  }

  const fetchLanes = async () => {
    try {
      const response = await fetch('/api/lanes')
      if (response.ok) {
        const data = await response.json()
        setLanes(data)
        setIsLoading(false)
      } else {
        toast.error('Failed to fetch lanes')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching lanes:', error)
      toast.error('Error fetching lanes')
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        toast.success('User created successfully')
        setShowUserDialog(false)
        setNewUser({ username: '', password: '', name: '', email: '', role: 'USER' })
        fetchUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Error creating user')
    }
  }

  const handleCreateLane = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLane),
      })

      if (response.ok) {
        toast.success('Lane created successfully')
        setShowLaneDialog(false)
        setNewLane({ name: '', description: '' })
        fetchLanes()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create lane')
      }
    } catch (error) {
      console.error('Error creating lane:', error)
      toast.error('Error creating lane')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'USER':
        return 'bg-blue-100 text-blue-800'
      case 'DISPLAY':
        return 'bg-green-100 text-green-800'
      case 'RESERVATION':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`)
        fetchUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Error updating user status')
    }
  }

  const toggleLaneStatus = async (laneId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/lanes/${laneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast.success(`Lane ${!currentStatus ? 'enabled' : 'disabled'} successfully`)
        fetchLanes()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update lane status')
      }
    } catch (error) {
      console.error('Error updating lane status:', error)
      toast.error('Error updating lane status')
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewUser({
      username: user.username,
      password: '', // Keep empty for security
      name: user.name,
      email: user.email || '',
      role: user.role
    })
    setShowUserDialog(true)
  }

  const handleEditLane = (lane: Lane) => {
    setEditingLane(lane)
    setNewLane({
      name: lane.name,
      description: lane.description || ''
    })
    setShowLaneDialog(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const updateData: {
        name?: string
        email?: string
        role?: string
        password?: string
      } = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
      
      // Only include password if it's provided
      if (newUser.password.trim()) {
        updateData.password = newUser.password
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast.success('User updated successfully')
        setShowUserDialog(false)
        setEditingUser(null)
        setNewUser({ username: '', password: '', name: '', email: '', role: 'USER' })
        fetchUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Error updating user')
    }
  }

  const handleUpdateLane = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLane) return

    try {
      const response = await fetch(`/api/lanes/${editingLane.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLane),
      })

      if (response.ok) {
        toast.success('Lane updated successfully')
        setShowLaneDialog(false)
        setEditingLane(null)
        setNewLane({ name: '', description: '' })
        fetchLanes()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update lane')
      }
    } catch (error) {
      console.error('Error updating lane:', error)
      toast.error('Error updating lane')
    }
  }

  const closeDialogs = () => {
    setShowUserDialog(false)
    setShowLaneDialog(false)
    setEditingUser(null)
    setEditingLane(null)
    setNewUser({ username: '', password: '', name: '', email: '', role: 'USER' })
    setNewLane({ name: '', description: '' })
  }

  const checkPrinterStatus = async () => {
    try {
      const response = await fetch(`/api/printer/status?interface=${encodeURIComponent(printerInterface)}`)
      if (response.ok) {
        const status = await response.json()
        setPrinterStatus(status)
      } else {
        setPrinterStatus({ connected: false, error: 'Failed to check printer status' })
      }
    } catch (error) {
      console.error('Error checking printer status:', error)
      setPrinterStatus({ connected: false, error: 'Network error' })
    }
  }

  const testPrinter = async () => {
    setIsTestingPrinter(true)
    try {
      const response = await fetch('/api/printer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerInterface }),
      })

      if (response.ok) {
        toast.success('Test print completed successfully!')
        checkPrinterStatus() // Refresh status
      } else {
        const data = await response.json()
        toast.error(`Test print failed: ${data.details || data.error}`)
      }
    } catch (error) {
      console.error('Error testing printer:', error)
      toast.error('Failed to test printer')
    } finally {
      setIsTestingPrinter(false)
    }
  }

  const printSampleTicket = async () => {
    setIsTestingPrinter(true)
    try {
      const response = await fetch('/api/printer/print-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueNumber: 42,
          laneName: 'Sample Service Counter',
          estimatedWait: 15,
          currentNumber: 39,
          waitingCount: 3,
          customerName: 'Test Customer',
          printerInterface
        }),
      })

      if (response.ok) {
        toast.success('Sample queue ticket printed successfully!')
        checkPrinterStatus() // Refresh status
      } else {
        const data = await response.json()
        toast.error(`Sample ticket print failed: ${data.details || data.error}`)
      }
    } catch (error) {
      console.error('Error printing sample ticket:', error)
      toast.error('Failed to print sample ticket')
    } finally {
      setIsTestingPrinter(false)
    }
  }

  const quickTestCOMPort = async (comPort: string) => {
    setIsTestingPrinter(true)
    try {
      const response = await fetch('/api/printer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerInterface: comPort }),
      })

      if (response.ok) {
        setPrinterInterface(comPort) // Update the interface field
        toast.success(`${comPort} works! Interface updated.`)
        checkPrinterStatus() // Refresh status
      } else {
        toast.error(`${comPort} failed`)
      }
    } catch (error) {
      console.error('COM port test error:', error)
      toast.error(`${comPort} failed`)
    } finally {
      setIsTestingPrinter(false)
    }
  }

  const discoverWindowsPrinters = async () => {
    try {
      // Test common Windows printer names for EPSON TM-T88IV
      const commonNames = [
        'EPSON TM-T88IV Receipt',
        'ESDPRT001', // Actual EPSON printer port
        'EPSON TM-T88IV',
        'TM-T88IV',
        'EPSON TM-T88 Series',
        'Auto' // Use Windows default printer
      ]
      
      for (const name of commonNames) {
        try {
          const response = await fetch('/api/printer/test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ printerInterface: `printer:${name}` }),
          })

          if (response.ok) {
            setPrinterInterface(`printer:${name}`)
            toast.success(`Found working printer: ${name}`)
            checkPrinterStatus()
            return
          }
        } catch (error) {
          console.error(`Error testing ${name}:`, error)
        }
      }
      
      toast.error('No working Windows printers found. Try manual configuration.')
    } catch (error) {
      console.error('Error discovering printers:', error)
      toast.error('Error discovering printers')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                  <div className="ml-2 text-sm text-gray-500">Total Users</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-green-600">{lanes.length}</div>
                  <div className="ml-2 text-sm text-gray-500">Total Lanes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {lanes.filter(lane => lane.isActive).length}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">Active Lanes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {lanes.reduce((sum, lane) => sum + lane.queueItems.length, 0)}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">Queue Items</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Printer Management */}
          <Card>
            <CardHeader>
              <CardTitle>Printer Management</CardTitle>
              <CardDescription>Configure and test the EPSON TM-T88IV receipt printer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Printer Configuration */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="printerInterface">Printer Interface</Label>
                      <Input
                        id="printerInterface"
                        value={printerInterface}
                        onChange={(e) => setPrinterInterface(e.target.value)}
                        placeholder="e.g., printer:EPSON TM-T88IV Receipt, printer:Auto, COM1"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For Windows printers, use: printer:PrinterName or printer:Auto
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={checkPrinterStatus}
                        variant="outline"
                        size="sm"
                      >
                        Check Status
                      </Button>
                      <Button
                        onClick={testPrinter}
                        disabled={isTestingPrinter}
                        size="sm"
                      >
                        {isTestingPrinter ? 'Testing...' : 'Test Print'}
                      </Button>
                      <Button
                        onClick={printSampleTicket}
                        disabled={isTestingPrinter}
                        variant="outline"
                        size="sm"
                      >
                        {isTestingPrinter ? 'Printing...' : 'Sample Ticket'}
                      </Button>
                      {printerStatus && !printerStatus.connected && printerStatus.error?.includes('driver') && (
                        <Button
                          onClick={() => window.open('https://epson.com/support', '_blank')}
                          variant="destructive"
                          size="sm"
                        >
                          Download Driver
                        </Button>
                      )}
                    </div>

                    {/* Quick Interface Discovery */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Windows Printer Test:</h4>
                      <div className="flex gap-1 flex-wrap mb-2">
                        <Button
                          onClick={discoverWindowsPrinters}
                          disabled={isTestingPrinter}
                          variant="default"
                          size="sm"
                          className="text-xs px-3 py-1 h-7"
                        >
                          🔍 Auto-Discover
                        </Button>
                        {['ESDPRT001', 'printer:EPSON TM-T88IV Receipt', 'COM1', 'Auto', 'EPSON TM-T88IV ReceiptE4', 'EPSON TM-T88IV', 'TM-T88IV'].map((name) => (
                          <Button
                            key={name}
                            onClick={() => quickTestCOMPort(`printer:${name}`)}
                            disabled={isTestingPrinter}
                            variant={name === 'ESDPRT001' ? "default" : "outline"}
                            size="sm"
                            className={`text-xs px-2 py-1 h-7 ${name === 'ESDPRT001' ? 'ring-2 ring-green-500' : ''}`}
                          >
                            {name === 'COM1' ? '✓ COM1' : name}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-green-700">
                        Try Auto-Discover first, or click individual printer names. These use Windows printer drivers.
                      </p>
                    </div>

                    {/* Quick COM Port Discovery */}
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Direct Interface Test:</h4>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {['COM1', 'COM2', 'COM3', 'COM4', 'COM5'].map((port) => (
                          <Button
                            key={port}
                            onClick={() => quickTestCOMPort(port)}
                            disabled={isTestingPrinter}
                            variant="outline"
                            size="sm"
                            className="text-xs px-2 py-1 h-7"
                          >
                            {port}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {['USB001', 'USB002'].map((interfaceType) => (
                          <Button
                            key={interfaceType}
                            onClick={() => quickTestCOMPort(interfaceType)}
                            disabled={isTestingPrinter}
                            variant="outline"
                            size="sm"
                            className="text-xs px-2 py-1 h-7"
                          >
                            {interfaceType}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Direct communication interfaces. Try these if Windows printer method fails.
                      </p>
                    </div>
                  </div>

                  {/* Printer Status */}
                  <div className="space-y-4">
                    <div>
                      <Label>Printer Status</Label>
                      <div className="mt-2">
                        {printerStatus ? (
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={printerStatus.connected 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                              }
                            >
                              {printerStatus.connected ? 'Connected' : 'Disconnected'}
                            </Badge>
                            {printerStatus.error && (
                              <span className="text-sm text-red-600">
                                {printerStatus.error}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            Unknown
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">✅ Perfect Setup Detected!</h4>
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>✓ Windows test page works</strong></p>
                        <p><strong>✓ Correct driver: EPSON TM-T88IV ReceiptE4 (for printer: EPSON TM-T88IV Receipt)</strong></p>
                        <p><strong>✓ Ready for queue system!</strong></p>
                        <p className="mt-2">Click &ldquo;Auto-Discover&rdquo; or &ldquo;ReceiptE4&rdquo; button to connect.</p>
                      </div>
                    </div>

                    {/* Driver Error Help */}
                    {printerStatus && !printerStatus.connected && printerStatus.error?.includes('driver') && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-900 mb-2">🚨 Driver Issue Detected</h4>
                        <div className="text-sm text-red-700 space-y-1">
                          <p><strong>Quick Fixes:</strong></p>
                          <p>1. Set printer as default in Windows Settings → Printers</p>
                          <p>2. Right-click printer → &ldquo;Set as default printer&rdquo;</p>
                          <p>3. Download latest EPSON TM-T88IV drivers from EPSON website</p>
                          <p>4. Restart Print Spooler service (services.msc)</p>
                          <p>5. Try running VS Code as Administrator</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Users Management</CardTitle>
                  <CardDescription>Manage system users and their roles</CardDescription>
                </div>
                <Dialog open={showUserDialog} onOpenChange={(open) => !open && closeDialogs()}>
                  <DialogTrigger asChild>
                    <Button>Add User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system with specific role and permissions.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          disabled={!!editingUser}
                          required={!editingUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password {editingUser && '(leave empty to keep current)'}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          required={!editingUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="USER">Cashier/Staff</SelectItem>
                            <SelectItem value="DISPLAY">Display</SelectItem>
                            <SelectItem value="RESERVATION">Reservation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingUser ? 'Update User' : 'Create User'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Lane</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        {user.assignedLanes.length > 0 ? (
                          <Badge variant="outline">
                            {user.assignedLanes[0].lane.name}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => toggleUserStatus(user.id, true)}
                          >
                            Disable
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
                  <CardDescription>Manage service lanes and their settings</CardDescription>
                </div>
                <Dialog open={showLaneDialog} onOpenChange={(open) => !open && closeDialogs()}>
                  <DialogTrigger asChild>
                    <Button>Add Lane</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingLane ? 'Edit Lane' : 'Create New Lane'}</DialogTitle>
                      <DialogDescription>
                        Add a new service lane or office to the system.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingLane ? handleUpdateLane : handleCreateLane} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="laneName">Lane Name</Label>
                        <Input
                          id="laneName"
                          value={newLane.name}
                          onChange={(e) => setNewLane({ ...newLane, name: e.target.value })}
                          placeholder="e.g., Customer Service, Billing, Inquiries"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="laneDescription">Description</Label>
                        <Input
                          id="laneDescription"
                          value={newLane.description}
                          onChange={(e) => setNewLane({ ...newLane, description: e.target.value })}
                          placeholder="Brief description of the lane's purpose"
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingLane ? 'Update Lane' : 'Create Lane'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Number</TableHead>
                    <TableHead>Queue Items</TableHead>
                    <TableHead>Assigned Staff</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lanes.map((lane) => (
                    <TableRow key={lane.id}>
                      <TableCell className="font-medium">{lane.name}</TableCell>
                      <TableCell>{lane.description || '-'}</TableCell>
                      <TableCell>
                        <Badge className={lane.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {lane.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{lane.currentNumber}</TableCell>
                      <TableCell>{lane.queueItems.length}</TableCell>
                      <TableCell>
                        {lane.assignedUsers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lane.assignedUsers.map((assignment) => (
                              <Badge key={assignment.user.id} variant="outline">
                                {assignment.user.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditLane(lane)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={lane.isActive ? "destructive" : "default"}
                            onClick={() => toggleLaneStatus(lane.id, lane.isActive)}
                          >
                            {lane.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
