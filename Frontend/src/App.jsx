import React, { useEffect, useState, useCallback } from "react";
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
  const [showHighRiskPopup, setShowHighRiskPopup] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const getMlRisk = (cpu, memory, pCount) => {
    try {
      const classScores = score([cpu, memory, pCount]);
      const maxScore = Math.max(...classScores);
      const winningClassIndex = classScores.indexOf(maxScore);

      if (winningClassIndex === 2) return "HIGH";
      if (winningClassIndex === 1) return "MEDIUM";
      return "LOW";
    } catch (err) {
      console.error("ML Score Error:", err);
      return "LOW"; 
    }
  };

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
    if (metrics?.risk === "HIGH") {
      setShowHighRiskPopup(true);
    } else {
      setShowHighRiskPopup(false);
    }
  }, [metrics?.risk]);

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-slate-200">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-semibold">
          Connecting to Hardware Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden relative">
      
      {/* HIGH RISK POPUP MODAL */}
      {showHighRiskPopup && metrics?.risk === "HIGH" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#1e293b] border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] max-w-lg w-full mx-4 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-5 text-red-500">
              <span className="text-4xl animate-pulse">⚠️</span>
              <h2 className="text-2xl font-extrabold tracking-widest uppercase">Critical Load</h2>
            </div>
            <div className="bg-[#0f172a] p-5 rounded-xl border border-red-500/30 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">AI Suggested Action</p>
              <p className="text-slate-200 text-lg leading-relaxed font-medium">{aiSuggestion}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowHighRiskPopup(false)}
                className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500 rounded-lg font-bold tracking-wide transition-colors"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <h2 className="font-bold text-lg tracking-wide text-white">IDSS Core</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="block px-4 py-3 bg-blue-600/20 text-blue-400 rounded-xl font-medium border border-blue-500/30">📊 Dashboard</a>
          <a href="#" className="block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">⚡ System Status</a>
          <a href="#" className="block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">📈 Analytics</a>
          <a href="#" className="block px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors">⚙️ Settings</a>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
            📥 Export Report
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* HEADER */}
        <div className="bg-[#1e293b] shadow-lg border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              System Load Dashboard 🚀
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Target: Lenovo IdeaPad 3
            </p>
          </div>

          <div
            className={`px-6 py-2 rounded-full font-bold border-2 shadow-lg transition-all duration-500 ${
              metrics.risk === "HIGH"
                ? "bg-red-500/10 border-red-500 text-red-400 animate-pulse"
                : metrics.risk === "MEDIUM"
                  ? "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                  : "bg-emerald-500/10 border-emerald-500 text-emerald-400"
            }`}
          >
            AI STATUS: {metrics.risk}
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Metric label="CPU" value={metrics.cpu} color="blue" />
          <Metric label="Memory" value={metrics.memory} color="purple" />
          <Metric label="Disk" value={metrics.disk} color="emerald" />
          <Metric label="Virtual Mem" value={metrics.vMem} color="orange" />
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-center">
            <p className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wider">
              Active Processes
            </p>
            <p className="text-4xl font-bold text-white">{metrics.pCount}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <p className="text-xs text-slate-500">
                I/O Queue: {metrics.dQueue}
              </p>
            </div>
          </div>
        </div>

        {/* 🤖 INTELLIGENT DECISION SUPPORT */}
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🧠</span>
            <h2 className="font-bold text-white text-xl">
              Intelligent Decision Support
            </h2>
          </div>
          <div
            className={`p-5 rounded-xl border-l-4 bg-[#0f172a] shadow-inner transition-all duration-700 ${
              metrics.risk === "HIGH"
                ? "border-red-500"
                : metrics.risk === "MEDIUM"
                  ? "border-yellow-500"
                  : "border-blue-500"
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
               metrics.risk === "HIGH" ? "text-red-400" : metrics.risk === "MEDIUM" ? "text-yellow-400" : "text-blue-400"
            }`}>
              AI Recommendation
            </p>
            <p className="text-lg leading-relaxed text-slate-300">{aiSuggestion}</p>
          </div>
        </div>

        {/* VISUALIZATIONS */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
            <h2 className="font-bold text-white mb-6 text-lg tracking-wide">
              Live Performance Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
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
                  stroke="#a855f7"
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

          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
            <h2 className="font-bold text-white mb-6 text-lg tracking-wide">
              Resource Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.processes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{ fill: "#334155", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  const colorMap = {
    blue: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    purple: "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]",
    emerald: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
    orange: "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]",
  };

  return (
    <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-6">
        <span className="text-slate-400 font-medium uppercase tracking-wider text-sm">{label}</span>
        <span className="text-3xl font-bold text-white">{value}%</span>
      </div>
      <div className="w-full bg-[#0f172a] h-2.5 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-700 rounded-full ${colorMap[color] || "bg-blue-500"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}