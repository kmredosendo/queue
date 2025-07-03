import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export interface JWTPayload {
  userId: number
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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      assignedLanes: {
        include: {
          lane: true
        }
      }
    }
  })

  return user
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
