import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// 引入你写好的核心算法 (注意路径是 ../src)
import { calculateBazi } from "../src/lib/bazi"; 

// 1. 创建服务器
const server = new McpServer({
  name: "harmony-name-mcp",
  version: "1.0.0",
});

// 2. 注册工具：算八字 (这是你的核心资产)
server.tool(
  "calculate_bazi",
  "Calculate traditional Chinese BaZi (Four Pillars), Five Elements strength, and Day Master analysis based on birth details.",
  {
    birthDate: z.string().describe("YYYY-MM-DD format (e.g. 1990-01-01)"),
    birthTime: z.string().describe("HH:mm format (e.g. 14:30) or 'unknown'. If specific time is known, provide it for better accuracy."),
    // 🆕 新增：支持经纬度，实现真太阳时计算
    longitude: z.number().optional().describe("Longitude of birth place (e.g. -74.006 for New York). Optional but recommended for True Solar Time accuracy."),
    timezone: z.string().optional().describe("Timezone string (e.g. 'America/New_York'). Required if longitude is provided."),
  },
  async ({ birthDate, birthTime, longitude, timezone }) => {
    try {
      // 构造 city 对象 (如果 Claude 传了经纬度)
      const city = (longitude && timezone) ? { longitude, timezone } : undefined;

      // 调用核心算法
      const result = calculateBazi(birthDate, birthTime, city);
      
      // 返回结果给 Claude
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: `Day Master: ${result.dayMaster} (${result.strength})`,
              bazi: result.bazi,
              wuxingCount: result.wuxing,
              favourableElements: result.favourableElements,
              avoidElements: result.avoidElements,
              analysis: result.coreExplanation,
              advice: "Use this data to recommend Chinese names that balance the user's chart."
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // 如果出错了，告诉 Claude 发生了什么
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to calculate BaZi",
              message: error instanceof Error ? error.message : String(error)
            }, null, 2),
          },
        ],
      };
    }
  }
);

// 3. 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HarmonyName MCP Server running on stdio");
}

main();