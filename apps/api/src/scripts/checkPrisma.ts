import { prisma } from '../lib/prisma.js'

async function checkPrisma() {
  try {
    const projects = await prisma.project.count()
    const requirements = await prisma.requirement.count()
    const testCases = await prisma.testCase.count()

    console.log('Prisma connected to Neon successfully.')
    console.log(`Projects: ${projects}`)
    console.log(`Requirements: ${requirements}`)
    console.log(`Test Cases: ${testCases}`)
  } catch {
    console.error('Prisma database query failed.')
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void checkPrisma()
