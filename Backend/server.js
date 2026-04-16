require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { getCurrentMetrics } = require("./Services/metricServices");
const { getAiSuggestion } = require("./Services/metricServices.js");
const app = express();

// ✅ MODIFIED: Strict CORS to allow your Vercel frontend to talk to Render
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ CONNECT MONGODB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected to Atlas"))
  .catch((err) => {
    console.error("❌ DB Error:", err);
    process.exit(1);
  });

// ✅ SCHEMA
const metricSchema = new mongoose.Schema({
  cpu: Number,
  memory: Number,
  disk: Number,
  virtual_memory: Number,
  process_count: Number,
  disk_queue: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Metric = mongoose.model("Metric", metricSchema);

app.get("/", (req, res) => {
  res.send("Backend running with real-time hardware telemetry 🚀");
});

// =======================
// ✅ METRICS (MODIFIED)
// =======================
app.get("/api/metrics", async (req, res) => {
  try {
    // 1. Check if we are in Production (Render) or Local
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // ✅ ON THE WEB: Find the LATEST entry pushed by your Dell G15 to Atlas
      const latestFromCloud = await Metric.findOne().sort({ timestamp: -1 });
      return res.json(latestFromCloud);
    } else {
      // ✅ ON YOUR LAPTOP: Get real hardware stats and save them
      const stats = await getCurrentMetrics();
      const savedMetric = await Metric.create(stats);
      return res.json(stats);
    }
  } catch (err) {
    console.error("❌ METRICS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch hardware metrics" });
  }
});

// =======================
// ✅ GET HISTORY
// =======================
app.get("/api/history", async (req, res) => {
  try {
    const data = await Metric.find().sort({ timestamp: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// =======================
// ✅ DELETE OLD DATA
// =======================
app.delete("/api/clean", async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Metric.deleteMany({ timestamp: { $lt: yesterday } });
    res.json({ message: "Old logs cleaned successfully" });
  } catch (err) {
    res.status(500).json({ error: "Cleanup failed" });
  }
});

app.post("/api/ai-suggestion", async (req, res) => {
  // Get metrics from the request body
  const { cpu, mem, proc, risk } = req.body;

  // Call the AI service
  const suggestion = await getAiSuggestion(cpu, mem, proc, risk);

  // Send the suggestion text back
  res.json({ suggestion: suggestion });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
