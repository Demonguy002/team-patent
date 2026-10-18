const mongoose = require("mongoose");

async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000
    });

    console.log("MongoDB Atlas connected successfully");
}

module.exports = connectDatabase;