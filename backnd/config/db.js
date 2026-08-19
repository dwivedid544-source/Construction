const prisma = require('./prisma');

const connectDB = async () => {
    try {
        console.log('Connecting to MySQL Database via Prisma...');
        await prisma.$connect();
        console.log('MySQL Database Connected Successfully via Prisma');
        return prisma;
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
