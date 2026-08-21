const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('Connecting to MongoDB Database...');
        const conn = await mongoose.connect(uri, {
            dbName: process.env.DB_NAME || 'construction_saas',
        });

        // Preload all Mongoose models to register schemas for population
        require('../models/index');

        console.log(`MongoDB Connected Successfully: ${conn.connection.host} / DB: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
