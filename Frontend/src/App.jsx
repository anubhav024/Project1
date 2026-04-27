import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

// 🚀 ML INTEGRATION
import { score } from "./model.js";

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState("AI Advisor is analyzing your hardware...");
  const [showHighRiskPopup, setShowHighRiskPopup] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // ⚙️ SETTINGS STATE
  const [pollingInterval, setPollingInterval] = useState(2000);
  const [enablePopups, setEnablePopups] = useState(true);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // --- CORE LOGIC (UNTOUCHED ML) ---
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
        const res = await axios.post(`${BASE_URL}/api/ai-suggestion`, { cpu, mem, proc: pCount, risk });
        setAiSuggestion(res.data.suggestion);
      } catch (err) {
        setAiSuggestion("AI Advice currently unavailable.");
      }
    },
    [BASE_URL]
  );

  const fetchData = useCallback(async () => {
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
        cpu, memory, disk, vMem, pCount, dQueue, risk: currentRisk,
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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu, memory, disk, vMem, risk: currentRisk 
        };
        return [...prev, newPoint].slice(-30);
      });
    } catch (err) {
      console.error("Hardware link lost:", err);
    }
  }, [BASE_URL]);

  useEffect(() => {
    if (metrics?.risk) {
      fetchGenAiAdvice(metrics.cpu, metrics.memory, metrics.pCount, metrics.risk);
    }
  }, [metrics?.risk, fetchGenAiAdvice]);

  useEffect(() => {
    if (metrics?.risk === "HIGH" && enablePopups) {
      setShowHighRiskPopup(true);
    } else {
      setShowHighRiskPopup(false);
    }
  }, [metrics?.risk, enablePopups]);

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchData, pollingInterval]);

  // --- COMPREHENSIVE EXPORT UTILITIES ---
  const exportData = async (format) => {
    if (history.length === 0) {
      alert("No telemetry data available to export yet. Please wait a few seconds.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `IDSS_Telemetry_Report_${timestamp}`;

    try {
      if (format === 'csv') {
        const headers = "Time,CPU(%),Memory(%),Disk(%),VirtualMemory(%),RiskLevel\n";
        const rows = history.map(h => `${h.time},${h.cpu},${h.memory},${h.disk},${h.vMem},${h.risk}`).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
      } 
      else if (format === 'json') {
        const jsonString = JSON.stringify(history, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.json`;
        link.click();
      } 
      else if (format === 'pdf') {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(18);
        doc.text("IDSS Core - System Telemetry Report", 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Final AI Risk Status: ${metrics?.risk || "UNKNOWN"}`, 14, 38);
        
        // Wrap AI Suggestion text
        const splitSuggestion = doc.splitTextToSize(`AI Recommendation: ${aiSuggestion}`, pageWidth - 28);
        doc.text(splitSuggestion, 14, 46);
        
        let currentY = 46 + (splitSuggestion.length * 5) + 5;

        // Capture Charts if on Dashboard
        const chartsEl = document.getElementById('charts-export-container');
        if (chartsEl) {
          const canvas = await html2canvas(chartsEl, { 
            scale: 2, 
            backgroundColor: '#0f172a' // match background
          });
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = pageWidth - 28;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          doc.addImage(imgData, 'PNG', 14, currentY, pdfWidth, pdfHeight);
          currentY += pdfHeight + 10;
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text("(Note: Export from the Dashboard view to include charts in this report)", 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 10;
        }

        // Add Data Table
        const tableColumn = ["Time", "CPU (%)", "Memory (%)", "Disk (%)", "V-Mem (%)", "Risk"];
        const tableRows = history.map(h => [h.time, h.cpu, h.memory, h.disk, h.vMem, h.risk]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: currentY,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [241, 245, 249] }
        });
        
        doc.save(`${filename}.pdf`);
      }
    } catch (error) {
      console.error("Export Failed:", error);
      alert(`Failed to export ${format.toUpperCase()}. Check console for details.`);
    }
  };

  if (!metrics) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-slate-200">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-semibold">Connecting to Hardware Telemetry...</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView metrics={metrics} history={history} aiSuggestion={aiSuggestion} />;
      case "status":
        return <StatusView metrics={metrics} history={history} />;
      case "analytics":
        return <AnalyticsView history={history} />;
      case "settings":
        return <SettingsView 
          pollingInterval={pollingInterval} setPollingInterval={setPollingInterval}
          enablePopups={enablePopups} setEnablePopups={setEnablePopups} 
        />;
      default:
        return <DashboardView metrics={metrics} history={history} aiSuggestion={aiSuggestion} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden relative">
      
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
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEnablePopups(false)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold transition-colors"
              >
                Mute Alerts
              </button>
              <button
                onClick={() => setShowHighRiskPopup(false)}
                className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500 rounded-lg font-bold tracking-wide transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <h2 className="font-bold text-lg tracking-wide text-white">IDSS Core</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {["dashboard", "status", "analytics", "settings"].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left block px-4 py-3 rounded-xl font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab === 'dashboard' ? '📊' : tab === 'status' ? '⚡' : tab === 'analytics' ? '📈' : '⚙️'} {tab}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase text-center mb-1 tracking-widest">Export Report</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => exportData('pdf')} className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors">PDF</button>
            <button onClick={() => exportData('csv')} className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors">CSV</button>
            <button onClick={() => exportData('json')} className="py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-bold transition-colors">JSON</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="bg-[#1e293b] shadow-lg border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Load Manager 🚀</h1>
            <p className="text-slate-400 text-sm mt-1">
              Target: Lenovo IdeaPad 3 | Active View: <span className="capitalize text-blue-400 font-semibold">{activeTab}</span>
            </p>
          </div>
          <div className={`px-6 py-2 rounded-full font-bold border-2 shadow-lg transition-all duration-500 ${
              metrics.risk === "HIGH" ? "bg-red-500/10 border-red-500 text-red-400 animate-pulse" : metrics.risk === "MEDIUM" ? "bg-yellow-500/10 border-yellow-500 text-yellow-400" : "bg-emerald-500/10 border-emerald-500 text-emerald-400"
            }`}
          >
            AI STATUS: {metrics.risk}
          </div>
        </div>

        {renderView()}

      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS / TABS
// ==========================================

function DashboardView({ metrics, history, aiSuggestion }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Metric label="CPU" value={metrics.cpu} color="blue" />
        <Metric label="Memory" value={metrics.memory} color="purple" />
        <Metric label="Disk" value={metrics.disk} color="emerald" />
        <Metric label="Virtual Mem" value={metrics.vMem} color="orange" />
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-center">
          <p className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wider">Processes</p>
          <p className="text-4xl font-bold text-white">{metrics.pCount}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-xs text-slate-500">I/O Queue: {metrics.dQueue}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🧠</span>
          <h2 className="font-bold text-white text-xl">Intelligent Decision Support</h2>
        </div>
        <div className={`p-5 rounded-xl border-l-4 bg-[#0f172a] shadow-inner transition-all duration-700 ${metrics.risk === "HIGH" ? "border-red-500" : metrics.risk === "MEDIUM" ? "border-yellow-500" : "border-blue-500"}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${metrics.risk === "HIGH" ? "text-red-400" : metrics.risk === "MEDIUM" ? "text-yellow-400" : "text-blue-400"}`}>AI Recommendation</p>
          <p className="text-lg leading-relaxed text-slate-300">{aiSuggestion}</p>
        </div>
      </div>

      {/* ID ADDED HERE FOR EXPORT SCRIPT TO TARGET */}
      <div id="charts-export-container" className="grid lg:grid-cols-2 gap-8">
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="font-bold text-white mb-6 text-lg tracking-wide">Live Performance Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{fill: '#94a3b8'}} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} itemStyle={{ color: '#f1f5f9' }} />
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="vMem" stroke="#f97316" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="font-bold text-white mb-6 text-lg tracking-wide">Resource Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.processes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8'}} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{fill: '#94a3b8'}} />
              <Tooltip cursor={{ fill: "#334155", opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function StatusView({ metrics, history }) {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">System Health Deep-Dive</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Active Processes</span>
              <span className="text-xl font-mono text-blue-400">{metrics.pCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Disk I/O Queue Length</span>
              <span className="text-xl font-mono text-emerald-400">{metrics.dQueue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">V-Mem Allocation</span>
              <span className="text-xl font-mono text-orange-400">{metrics.vMem}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-black/50 p-6 rounded-2xl shadow-lg border border-slate-800 font-mono text-xs overflow-hidden flex flex-col h-[600px]">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-slate-500 font-sans tracking-widest uppercase">Live Telemetry Terminal</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 flex flex-col-reverse pr-2">
          {history.map((log, i) => (
            <div key={i} className="flex gap-4 border-b border-slate-800/50 py-1 hover:bg-slate-800/30">
              <span className="text-slate-500">[{log.time}]</span>
              <span className="text-blue-400">CPU:{log.cpu.toString().padStart(3, ' ')}%</span>
              <span className="text-purple-400">MEM:{log.memory.toString().padStart(3, ' ')}%</span>
              <span className="text-emerald-400">DSK:{log.disk.toString().padStart(3, ' ')}%</span>
              <span className={`font-bold ml-auto ${log.risk === 'HIGH' ? 'text-red-500' : log.risk === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500'}`}>
                [{log.risk}]
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ history }) {
  const stats = useMemo(() => {
    if (!history.length) return { avgCpu: 0, avgMem: 0, avgDisk: 0, high: 0, med: 0, low: 0, total: 1 };
    const total = history.length;
    const sums = history.reduce((acc, curr) => ({
      cpu: acc.cpu + curr.cpu, mem: acc.mem + curr.memory, disk: acc.disk + curr.disk
    }), { cpu: 0, mem: 0, disk: 0 });
    
    return {
      avgCpu: (sums.cpu / total).toFixed(1),
      avgMem: (sums.mem / total).toFixed(1),
      avgDisk: (sums.disk / total).toFixed(1),
      high: history.filter(h => h.risk === 'HIGH').length,
      med: history.filter(h => h.risk === 'MEDIUM').length,
      low: history.filter(h => h.risk === 'LOW').length,
      total
    };
  }, [history]);

  const bottleneck = Math.max(stats.avgCpu, stats.avgMem, stats.avgDisk) == stats.avgCpu ? "CPU" : 
                     Math.max(stats.avgCpu, stats.avgMem, stats.avgDisk) == stats.avgMem ? "Memory" : "Disk";

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">Session Averages (Last {stats.total} ticks)</h2>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Average CPU</span><span className="text-white font-bold">{stats.avgCpu}%</span></div>
            <div className="w-full bg-[#0f172a] h-2 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${stats.avgCpu}%` }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Average Memory</span><span className="text-white font-bold">{stats.avgMem}%</span></div>
            <div className="w-full bg-[#0f172a] h-2 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${stats.avgMem}%` }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Average Disk</span><span className="text-white font-bold">{stats.avgDisk}%</span></div>
            <div className="w-full bg-[#0f172a] h-2 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${stats.avgDisk}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">AI Risk Distribution</h2>
          <p className="text-sm text-slate-400 mb-6">Proportion of time spent in respective ML risk states.</p>
          <div className="flex h-8 rounded-lg overflow-hidden mb-4 shadow-inner">
            <div className="bg-red-500 transition-all" style={{ width: `${(stats.high / stats.total) * 100}%` }} title="High Risk"></div>
            <div className="bg-yellow-500 transition-all" style={{ width: `${(stats.med / stats.total) * 100}%` }} title="Medium Risk"></div>
            <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.low / stats.total) * 100}%` }} title="Low Risk"></div>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-red-400">HIGH ({Math.round((stats.high / stats.total) * 100)}%)</span>
            <span className="text-yellow-400">MEDIUM ({Math.round((stats.med / stats.total) * 100)}%)</span>
            <span className="text-emerald-400">LOW ({Math.round((stats.low / stats.total) * 100)}%)</span>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Detected Bottleneck</span>
          <span className="text-xl font-bold text-white">{bottleneck} Limits</span>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ pollingInterval, setPollingInterval, enablePopups, setEnablePopups }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">System Preferences</h2>
        
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telemetry Refresh Rate</label>
            <p className="text-xs text-slate-500 mb-3">Determines how often the UI requests data from the Node.js hardware link.</p>
            <select 
              value={pollingInterval} 
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              className="bg-[#0f172a] border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
            >
              <option value={1000}>Aggressive (1 Second) - High UI Load</option>
              <option value={2000}>Standard (2 Seconds) - Recommended</option>
              <option value={5000}>Relaxed (5 Seconds) - Power Saving</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Critical Load Interrupts</label>
            <p className="text-xs text-slate-500 mb-3">Allow the AI to generate a full-screen popup when hardware risk is categorized as HIGH.</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enablePopups} onChange={(e) => setEnablePopups(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              <span className="ml-3 text-sm font-medium text-white">{enablePopups ? 'Enabled' : 'Muted'}</span>
            </label>
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