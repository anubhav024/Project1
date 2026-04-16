// 1. Load environment variables (pointing to the Backend folder)
require("dotenv").config({ path: "../.env" });

const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Metric = require("../models/Metric");

// 2. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("📡 Connected to MongoDB Atlas for Historical Import...");
    startImport();
  })
  .catch((err) => {
    console.error("❌ Connection Error:", err);
    process.exit(1);
  });

function startImport() {
  console.log("🚀 Starting CSV Import...");

  // 3. Read the CSV file
  fs.createReadStream("../win_system_metrics_v2.csv")
    .pipe(csv())
    .on("data", async (row) => {
      try {
        // 4. Map ALL CSV columns to your updated Database Schema
        await Metric.create({
          cpu: parseFloat(row.cpu_utility_pct) || 0,
          memory: parseFloat(row.memory_in_use_pct) || 0,
          disk: parseFloat(row.disk_usage_pct) || 0,
          // ✅ NEW FIELDS IMPORTED FROM CSV
          virtual_memory: parseFloat(row.virtual_memory_pct) || 0,
          process_count: parseInt(row.process_count) || 0,
          disk_queue: parseFloat(row.disk_queue_length) || 0,
          timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        });
      } catch (err) {
        console.error("❌ Row Import Error:", err.message);
      }
    })
    .on("end", () => {
      console.log("✅ All Historical CSV Data Imported Successfully!");
      // Allow buffer time for Atlas to process the bulk writes
      setTimeout(() => {
        mongoose.disconnect();
        console.log("🔌 Import Complete. Disconnected.");
      }, 5000);
    })
    .on("error", (err) => {
      console.error("❌ File Read Error:", err);
    });
}
