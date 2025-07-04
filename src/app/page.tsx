'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Login successful!')
        
        // Redirect based on user role
        switch (data.user.role) {
          case 'ADMIN':
            router.push('/admin')
            break
          case 'USER':
            router.push('/user')
            break
          case 'DISPLAY':
            router.push('/display')
            break
          case 'RESERVATION':
            router.push('/reservation')
            break
          default:
            router.push('/admin')
        }
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAccess = (role: string) => {
    switch (role) {
      case 'DISPLAY':
        router.push('/display')
        break
      case 'RESERVATION':
        router.push('/reservation')
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Queue Management System</h1>
          <p className="text-base sm:text-lg text-gray-600">Efficient queue management for better customer service</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Quick Access Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>Direct access to public interfaces</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => handleQuickAccess('RESERVATION')}
                className="w-full h-16 sm:h-20 text-base sm:text-lg flex flex-col items-center justify-center gap-1"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📱</span>
                  <span className="font-semibold">Customer Reservation</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">Get your queue number</span>
              </Button>
              <Button
                onClick={() => handleQuickAccess('DISPLAY')}
                className="w-full h-16 sm:h-20 text-base sm:text-lg flex flex-col items-center justify-center gap-1"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📺</span>
                  <span className="font-semibold">Queue Display</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">View current queue status</span>
              </Button>
            </CardContent>
          </Card>

          {/* Login Card */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Login</CardTitle>
              <CardDescription>Login to access admin panel or cashier interface</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
