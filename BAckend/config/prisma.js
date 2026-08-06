const { PrismaClient } = require('@prisma/client');

let prismaInstance = null;

const getPrismaClient = () => {
  if (!prismaInstance) {
    // Only instantiate Prisma Client when Prisma driver is active
    try {
      prismaInstance = new PrismaClient();
    } catch (e) {
      console.warn('PrismaClient lazy initialization warning:', e.message);
    }
  }
  return prismaInstance;
};

module.exports = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error(`PrismaClient is not initialized. Ensure process.env.DB_DRIVER='prisma' and connection is configured.`);
    }
    return client[prop];
  }
});
