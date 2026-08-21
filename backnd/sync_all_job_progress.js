const prisma = require('./config/prisma');
const { updateJobProgress } = require('./controllers/jobTaskController');
require('dotenv').config();

const syncAll = async () => {
    try {
        console.log('Connecting to database...');

        const jobs = await prisma.job.findMany({});
        console.log(`Recalculating progress for ${jobs.length} jobs...`);

        for (const job of jobs) {
            await updateJobProgress(job.id);
            const updated = await prisma.job.findUnique({ where: { id: job.id } });
            console.log(`Job "${job.name}": Progress ${updated?.progress || 0}%, Status ${updated?.status}`);
        }

        console.log('All jobs and projects synced successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing:', err);
        process.exit(1);
    }
};

syncAll();
