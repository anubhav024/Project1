require('dotenv').config({ path: './Backend/.env' });
const fs = require("fs");
const si = require("systeminformation");

// 🔥 DB + Model
require("./db");
const Metric = require("./models/Metric");

const CONFIG = {
  intervalMs: 2000,
  csvPath: "./win_system_metrics_v2.csv",
};

// ✅ Create CSV if not exists
if (!fs.existsSync(CONFIG.csvPath)) {
  const headers = [
    "timestamp",
    "cpu_utility_pct",
    "memory_in_use_pct",
    "disk_usage_pct",
    "virtual_memory_pct",
    "process_count",
    "disk_queue_length",
  ].join(",");

  fs.writeFileSync(CONFIG.csvPath, headers + "\n");
}

// 🔥 SAFE NUMBER FUNCTION
const safeNumber = (val) => {
  return isNaN(val) || val === null || val === undefined ? 0 : val;
};

async function collectMetrics() {
  try {
    const timestamp = new Date().toISOString();

    const [cpu, mem, processes, diskIO, fsData] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.processes(),
        si.disksIO().catch(() => ({ qIO: 0 })),
        si.fsSize().catch(() => [])
    ]);

    // ✅ CALCULATIONS
    const cpuUsage = safeNumber(cpu.currentLoad);
    const memoryPct = safeNumber((mem.active / mem.total) * 100);
    const virtualMemPct = mem.swaptotal > 0 
        ? safeNumber((mem.swapused / mem.swaptotal) * 100) 
        : 0;
    const processCount = safeNumber(processes.all);
    const diskUsage = safeNumber(fsData[0]?.use || 0);
    const diskQueue = safeNumber(diskIO?.qIO || 0);

    // ✅ SAVE TO CSV
    const row = [
        timestamp,
        cpuUsage.toFixed(2),
        memoryPct.toFixed(2),
        diskUsage.toFixed(2),
        virtualMemPct.toFixed(2),
        processCount,
        diskQueue.toFixed(2),
    ].join(",") + "\n";

    fs.appendFileSync(CONFIG.csvPath, row);

    // ✅ SAVE TO DATABASE (Updated with new fields)
    await Metric.create({
      cpu: parseFloat(cpuUsage.toFixed(2)),
      memory: parseFloat(memoryPct.toFixed(2)),
      disk: parseFloat(diskUsage.toFixed(2)),
      virtual_memory: parseFloat(virtualMemPct.toFixed(2)), // 🆕 Added
      process_count: processCount,                          // 🆕 Added
      disk_queue: parseFloat(diskQueue.toFixed(2)),         // 🆕 Added
      timestamp: new Date(),
    });

    console.log(
      `✅ Stored → CPU:${cpuUsage.toFixed(2)}% | MEM:${memoryPct.toFixed(2)}% | DISK:${diskUsage.toFixed(2)}% | V-MEM:${virtualMemPct.toFixed(2)}% | PROC:${processCount}`
    );
  } catch (error) {
    console.error("❌ Error collecting metrics:", error);
  }
}

console.log("🚀 System Collector Started...");
setInterval(collectMetrics, CONFIG.intervalMs);