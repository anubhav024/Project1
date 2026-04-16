const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    // 🔥 CPU: Using 'min' and 'max' to prevent junk data
    cpu: { type: Number, required: true, min: 0, max: 100 },

    // 🔥 Memory: Ensuring we always have a value
    memory: { type: Number, required: true, min: 0, max: 100 },

    disk: { type: Number, default: 0 },

    virtual_memory: { type: Number, default: 0 },

    // 🔥 Process Count: Using 'Number' but ensuring it's not a decimal
    process_count: { type: Number, default: 0 },

    // 🔥 Timestamp: Setting 'expires' for automatic cleanup (Optional)
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // 🔥 Timestamps: Automatically adds 'createdAt' and 'updatedAt'
    timestamps: true,
  },
);

module.exports = mongoose.model("Metric", metricSchema);
