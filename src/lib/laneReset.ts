import { prisma } from './prisma';

let lastResetDate: string | null = null;

export async function resetLaneNumbersOncePerDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastResetDate === today) return;

  // Check if already reset today (in case of multiple serverless instances)
  const setting = await prisma.setting.findUnique({ where: { key: 'lastLaneReset' } });
  if (setting?.value === today) {
    lastResetDate = today;
    return;
  }

  await prisma.lane.updateMany({ data: { currentNumber: 0 } });
  await prisma.setting.upsert({
    where: { key: 'lastLaneReset' },
    update: { value: today },
    create: { key: 'lastLaneReset', value: today },
  });
  lastResetDate = today;
  console.log('✅ All lane currentNumber values reset to 0 for', today);
}
