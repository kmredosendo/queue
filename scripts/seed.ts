import { PrismaClient, UserRole, LaneType } from '@prisma/client'
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
  const cashierPassword = await bcrypt.hash('123', 12)
  const cashier = await prisma.user.upsert({
    where: { username: 'c1' },
    update: {},
    create: {
      username: 'c1',
      password: cashierPassword,
      name: 'Cashier One',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created cashier user:', cashier.username)

  // Create second cashier user
  const cashier2Password = await bcrypt.hash('123', 12)
  const cashier2 = await prisma.user.upsert({
    where: { username: 'c2' },
    update: {},
    create: {
      username: 'c2',
      password: cashier2Password,
      name: 'Cashier Two',
      role: UserRole.USER,
    },
  })
  console.log('✅ Created cashier user:', cashier2.username)

  // Create lanes as specified
  const cashier1Lane = await prisma.lane.create({
    data: {
      name: 'Cashier 1',
      description: 'Cashier 1',
      type: LaneType.REGULAR,
      isActive: true,
    },
  })
  console.log('✅ Created lane:', cashier1Lane.name)

  const cashier2Lane = await prisma.lane.create({
    data: {
      name: 'Cashier 2',
      description: 'Cashier 2',
      type: LaneType.REGULAR,
      isActive: true,
    },
  })
  console.log('✅ Created lane:', cashier2Lane.name)

  const pwdSeniorLane = await prisma.lane.create({
    data: {
      name: 'PWD/Senior',
      description: 'Priority lane for PWDs and Senior Citizens',
      type: LaneType.PRIORITY,
      isActive: true,
    },
  })
  console.log('✅ Created lane:', pwdSeniorLane.name)

  // Assignments
  await prisma.laneUser.create({
    data: {
      userId: cashier.id,
      laneId: cashier1Lane.id,
    },
  })
  console.log('✅ Assigned', cashier.name, 'to', cashier1Lane.name)

  await prisma.laneUser.create({
    data: {
      userId: cashier2.id,
      laneId: cashier2Lane.id,
    },
  })
  console.log('✅ Assigned', cashier2.name, 'to', cashier2Lane.name)

  await prisma.laneUser.create({
    data: {
      userId: cashier.id,
      laneId: pwdSeniorLane.id,
    },
  })
  console.log('✅ Assigned', cashier.name, 'to', pwdSeniorLane.name)

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
