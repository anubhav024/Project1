import React, { useEffect, useState, useCallback } from "react"; // Added useCallback
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

// 🚀 ML INTEGRATION
import { score } from "./model.js";

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(
    "AI Advisor is analyzing your hardware...",
  );

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // 🚀 ML INTEGRATION: Improved threshold logic
  const getMlRisk = (cpu, memory, pCount) => {
    try {
      const prediction = score([cpu, memory, pCount]);
      if (prediction >= 1.5) return "HIGH";
      if (prediction >= 0.5) return "MEDIUM";
      return "LOW";
    } catch (err) {
      console.error("ML Score Error:", err);
      return "LOW"; // Fallback
    }
  };

  // 🤖 GEN AI INTEGRATION: Wrapped in useCallback to prevent unnecessary re-renders
  const fetchGenAiAdvice = useCallback(
    async (cpu, mem, pCount, risk) => {
      try {
        const res = await axios.post(`${BASE_URL}/api/ai-suggestion`, {
          cpu,
          mem,
          proc: pCount,
          risk,
        });
        setAiSuggestion(res.data.suggestion);
      } catch (err) {
        setAiSuggestion("AI Advice currently unavailable.");
      }
    },
    [BASE_URL],
  );

  const fetchData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/metrics`);
      const data = res.data;

      // Clean the incoming data
      const cpu = Math.round(Number(data.cpu)) || 0;
      const memory = Math.round(Number(data.memory)) || 0;
      const disk = Math.round(Number(data.disk)) || 0;
      const vMem = Math.round(Number(data.virtual_memory)) || 0;
      const pCount = parseInt(data.process_count) || 0;
      const dQueue = data.disk_queue || 0;

      const currentRisk = getMlRisk(cpu, memory, pCount);

      const safeData = {
        cpu,
        memory,
        disk,
        vMem,
        pCount,
        dQueue,
        risk: currentRisk,
        processes: [
          { name: "CPU", value: cpu },
          { name: "RAM", value: memory },
          { name: "Disk", value: disk },
          { name: "V-Mem", value: vMem },
        ],
      };

      setMetrics(safeData);

      // 📈 HISTORY MANAGEMENT: Limits history to 30 points for performance
      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          cpu,
          memory,
          disk,
          vMem,
        };
        const updatedHistory = [...prev, newPoint];
        return updatedHistory.slice(-30);
      });
    } catch (err) {
      console.error("Hardware link lost:", err);
    }
  };

  // 🤖 Trigger GenAI only when Risk changes
  useEffect(() => {
    if (metrics?.risk) {
      fetchGenAiAdvice(
        metrics.cpu,
        metrics.memory,
        metrics.pCount,
        metrics.risk,
      );
    }
  }, [metrics?.risk, fetchGenAiAdvice]);

  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-semibold text-gray-600">
          Connecting to Hardware Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* HEADER */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            System Load Dashboard 🚀
          </h1>
          <p className="text-gray-500 text-sm">
            Target: Dell G15 Ryzen Edition
          </p>
        </div>

        <div
          className={`px-6 py-2 rounded-full font-bold border-2 transition-all duration-500 ${
            metrics.risk === "HIGH"
              ? "bg-red-50 border-red-200 text-red-600 scale-105"
              : metrics.risk === "MEDIUM"
                ? "bg-yellow-50 border-yellow-200 text-yellow-600"
                : "bg-green-50 border-green-200 text-green-600"
          }`}
        >
          AI STATUS: {metrics.risk}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        <Metric label="CPU" value={metrics.cpu} color="blue" />
        <Metric label="Memory" value={metrics.memory} color="purple" />
        <Metric label="Disk" value={metrics.disk} color="emerald" />
        <Metric label="Virtual Mem" value={metrics.vMem} color="orange" />
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500 font-medium mb-1 text-sm">
            Active Processes
          </p>
          <p className="text-3xl font-bold text-gray-800">{metrics.pCount}</p>
          <p className="text-xs text-gray-400 mt-2">
            I/O Queue: {metrics.dQueue}
          </p>
        </div>
      </div>

      {/* 🤖 INTELLIGENT DECISION SUPPORT */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧠</span>
          <h2 className="font-bold text-gray-700 text-lg">
            Intelligent Decision Support
          </h2>
        </div>
        <div
          className={`p-4 rounded-xl border-l-4 transition-all duration-700 ${
            metrics.risk === "HIGH"
              ? "bg-red-50 text-red-800 border-red-500"
              : metrics.risk === "MEDIUM"
                ? "bg-yellow-50 text-yellow-800 border-yellow-500"
                : "bg-blue-50 text-blue-800 border-blue-500"
          }`}
        >
          <p className="text-sm opacity-80 mb-1 font-semibold uppercase tracking-wider">
            AI RECOMMENDATION
          </p>
          <p className="text-lg leading-relaxed">{aiSuggestion}</p>
        </div>
      </div>

      {/* VISUALIZATIONS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-700 mb-4">
            Live Performance Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="vMem"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-700 mb-4">
            Resource Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.processes}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  const colorMap = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
    orange: "bg-orange-500",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-end mb-4">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="text-2xl font-bold">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${colorMap[color] || "bg-blue-500"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
