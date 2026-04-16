const si = require("systeminformation");
const Groq = require("groq-sdk"); // 🚀 Added Groq SDK
require("dotenv").config();

// Initialize Groq with your API Key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getAiSuggestion = async (cpu, mem, processes, risk) => {
  // Mapping numerical risk to descriptive words for the LLM
  const riskMap = { 0: "Low/Stable", 1: "Medium/Moderate", 2: "High/Critical" };
  const riskLevel = riskMap[String(risk)] || "Unknown";

  const systemPrompt =
    "You are a specialized System Performance Optimizer. Provide ONE specific, technical, and actionable suggestion under 15 words. No introductory text. Directly state the solution.";
  const userPrompt = `Metrics -> CPU: ${cpu}%, RAM: ${mem}%, Processes: ${processes}, Risk: ${riskLevel}. What is the fix?`;

  try {
    // 🚀 Groq Chat Completion call
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile", // 🧠 Highly smart and fast model
      temperature: 0.5,
      max_tokens: 50,
    });

    return (
      chatCompletion.choices[0]?.message?.content?.trim() ||
      "Monitor background threads."
    );
  } catch (error) {
    console.error("Groq API Error:", error);
    return "Check background tasks and thermal throttling.";
  }
};

async function getCurrentMetrics() {
  try {
    // Parallel fetching for high performance
    const [cpu, mem, disk, processes] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.processes(),
    ]);

    return {
      cpu: parseFloat(cpu.currentLoad.toFixed(1)),
      memory: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),

      // Prevent Division by Zero if swap is disabled
      virtual_memory:
        mem.swaptotal > 0
          ? parseFloat(((mem.swapused / mem.swaptotal) * 100).toFixed(1))
          : 0,

      disk: parseFloat((disk[0]?.use || 0).toFixed(1)),
      process_count: processes.all,
      timestamp: new Date(),
    };
  } catch (e) {
    console.error("❌ Hardware Metrics Error:", e);
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      virtual_memory: 0,
      process_count: 0,
      timestamp: new Date(),
    };
  }
}

module.exports = {
  getCurrentMetrics,
  getAiSuggestion,
};
