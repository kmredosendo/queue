import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetLaneNumbers() {
  await prisma.lane.updateMany({
    data: { currentNumber: 0 }
  });
  console.log('✅ All lane currentNumber values reset to 0');
}

resetLaneNumbers()
  .catch((e) => {
    console.error('❌ Failed to reset lane numbers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
