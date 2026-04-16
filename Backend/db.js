require('dotenv').config(); 
const mongoose = require("mongoose");

// ✅ Define Connection Options for Stability
const connectionOptions = {
  serverSelectionTimeoutMS: 5000, // Keep trying for 5 seconds
  socketTimeoutMS: 45000,         // Close sockets after 45 seconds of inactivity
};

// ✅ Database Connection with Improved Error Handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    console.log(`✅ MongoDB Connected to Atlas: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    
    // If it fails, wait 5 seconds and try again
    console.log("🔄 Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Monitor the connection for changes
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB Disconnected! Attempting to reconnect...');
});

// Start the initial connection
connectDB();

module.exports = mongoose;