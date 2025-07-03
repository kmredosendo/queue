import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export interface JWTPayload {
  userId: number | string // Temporary: handle both old string IDs and new integer IDs
  username: string
  role: UserRole
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' })
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
}

export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      // Also check for token in cookies
      const cookieToken = request.cookies.get('auth-token')?.value
      if (!cookieToken) return null
      return verifyJWT(cookieToken)
    }

    return verifyJWT(token)
  } catch {
    return null
  }
}

export async function getCurrentUser(request: NextRequest) {
  const payload = await authenticateRequest(request)
  if (!payload) return null

  try {
    // Handle transition from string IDs to integer IDs
    let userId: number
    if (typeof payload.userId === 'string') {
      // If it's a string (old token), check if it's a CUID (old format)
      const parsed = parseInt(payload.userId, 10)
      if (isNaN(parsed) || payload.userId.length > 10) {
        // This is likely an old CUID string, treat as invalid token
        return null
      }
      userId = parsed
    } else {
      userId = payload.userId
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedLanes: {
          include: {
            lane: true
          }
        }
      }
    })

    return user
  } catch {
    // If there's any database error, the token might be from the old schema
    return null
  }
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
