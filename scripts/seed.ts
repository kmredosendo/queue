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
      email: 'admin@queue.system',
      role: UserRole.ADMIN,
    },
  })
  console.log('✅ Created admin user:', admin.username)

  // Create cashier user
  const cashierPassword = await bcrypt.hash('cashier123', 12)
  const cashier = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      password: cashierPassword,
      name: 'Cashier One',
      email: 'cashier@queue.system',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created cashier user:', cashier.username)

  // Create display user
  const displayPassword = await bcrypt.hash('display123', 12)
  const display = await prisma.user.upsert({
    where: { username: 'display' },
    update: {},
    create: {
      username: 'display',
      password: displayPassword,
      name: 'Display Screen',
      role: UserRole.DISPLAY,
    },
  })
  console.log('✅ Created display user:', display.username)

  // Create reservation user
  const reservationPassword = await bcrypt.hash('reservation123', 12)
  const reservation = await prisma.user.upsert({
    where: { username: 'reservation' },
    update: {},
    create: {
      username: 'reservation',
      password: reservationPassword,
      name: 'Reservation System',
      role: UserRole.RESERVATION,
    },
  })
  console.log('✅ Created reservation user:', reservation.username)

  // Create sample lanes
  const customerService = await prisma.lane.upsert({
    where: { id: 'customer-service' },
    update: {},
    create: {
      id: 'customer-service',
      name: 'Customer Service',
      description: 'General customer inquiries and support',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', customerService.name)

  const billing = await prisma.lane.upsert({
    where: { id: 'billing' },
    update: {},
    create: {
      id: 'billing',
      name: 'Billing & Payments',
      description: 'Payment processing and billing inquiries',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', billing.name)

  const technical = await prisma.lane.upsert({
    where: { id: 'technical' },
    update: {},
    create: {
      id: 'technical',
      name: 'Technical Support',
      description: 'Technical assistance and troubleshooting',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', technical.name)

  const accounts = await prisma.lane.upsert({
    where: { id: 'accounts' },
    update: {},
    create: {
      id: 'accounts',
      name: 'New Accounts',
      description: 'New account setup and registration',
      isActive: true,
    },
  })
  console.log('✅ Created lane:', accounts.name)

  // Assign cashier to customer service lane
  await prisma.laneUser.upsert({
    where: {
      userId_laneId: {
        userId: cashier.id,
        laneId: customerService.id,
      },
    },
    update: {},
    create: {
      userId: cashier.id,
      laneId: customerService.id,
    },
  })
  console.log('✅ Assigned cashier to Customer Service lane')

  // Create additional cashier for testing multiple lanes
  const cashier2Password = await bcrypt.hash('cashier123', 10)
  const cashier2 = await prisma.user.upsert({
    where: { username: 'cashier2' },
    update: {},
    create: {
      username: 'cashier2',
      password: cashier2Password,
      name: 'Jane Smith',
      email: 'cashier2@example.com',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created second cashier user:', cashier2.username)

  // Assign second cashier to billing lane only (single assignment)
  await prisma.laneUser.upsert({
    where: {
      userId_laneId: {
        userId: cashier2.id,
        laneId: billing.id,
      },
    },
    update: {},
    create: {
      userId: cashier2.id,
      laneId: billing.id,
    },
  })
  console.log('✅ Assigned cashier2 to Billing lane')

  console.log('🎉 Seed completed!')
  console.log('\n📝 Demo credentials:')
  console.log('Admin: admin / admin123')
  console.log('Cashier (Customer Service): cashier / cashier123')
  console.log('Cashier2 (Billing): cashier2 / cashier123')
  console.log('Display: display / display123')
  console.log('Reservation: reservation / reservation123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
