require('dotenv').config();
const connectDB = require('../config/db');
const prisma = require('../config/prisma');

async function test() {
    try {
        await connectDB();
        const user = await prisma.user.findFirst({
            where: { role: 'COMPANY_OWNER' }
        });
        const project = await prisma.project.findFirst({
            where: { companyId: user.companyId }
        });

        console.log('User:', user.fullName, 'Role:', user.role, 'CompanyId:', user.companyId);
        console.log('Project:', project.name, 'Id:', project.id);

        const log = await prisma.dailyLog.create({
            data: {
                companyId: user.companyId,
                projectId: project.id,
                date: new Date(),
                weather: JSON.stringify({ status: 'Sunny' }),
                notes: 'Test site log',
                createdBy: user.id,
                workPerformed: 'Tested framing and foundation work',
                visitors: null,
                safetyIncidents: null
            }
        });

        console.log('Created Daily Log successfully:', log.id);
        
        // Clean up test log
        await prisma.dailyLog.delete({ where: { id: log.id } });
        console.log('Cleaned up test daily log.');
    } catch (e) {
        console.error('Error in test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
