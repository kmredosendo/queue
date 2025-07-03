import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'System Administrator',
      role: UserRole.ADMIN,
    },
  })
  console.log('✅ Created admin user:', admin.username)

  // Create cashier user
  const cashierPassword = await bcrypt.hash('cashier123', 12)
  const cashier = await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {},
    create: {
      username: 'cashier1',
      password: cashierPassword,
      name: 'Cashier One',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created cashier user:', cashier.username)

  // Create second cashier user
  const cashier2Password = await bcrypt.hash('cashier123', 12)
  const cashier2 = await prisma.user.upsert({
    where: { username: 'cashier2' },
    update: {},
    create: {
      username: 'cashier2',
      password: cashier2Password,
      name: 'Cashier Two',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created cashier user:', cashier2.username)

  // Create sample lanes
  const customerService = await prisma.lane.create({
    data: {
      name: 'Customer Service',
      description: 'General customer inquiries and support',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', customerService.name)

  const billing = await prisma.lane.create({
    data: {
      name: 'Billing & Payments',
      description: 'Payment processing and billing inquiries',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', billing.name)

  const technical = await prisma.lane.create({
    data: {
      name: 'Technical Support',
      description: 'Technical assistance and troubleshooting',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', technical.name)

  // Assign cashiers to lanes
  await prisma.laneUser.create({
    data: {
      userId: cashier.id,
      laneId: customerService.id,
    },
  })
  console.log('✅ Assigned', cashier.name, 'to', customerService.name)

  await prisma.laneUser.create({
    data: {
      userId: cashier2.id,
      laneId: billing.id,
    },
  })
  console.log('✅ Assigned', cashier2.name, 'to', billing.name)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
