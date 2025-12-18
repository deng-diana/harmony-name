# 🎓 MCP Server 学习指南（给12岁CEO的版本）

## 📚 什么是 MCP？

想象一下：
- **你的网站** = 一家餐厅（客人必须来店里吃饭）
- **MCP Server** = 外卖服务（客人可以在家里点餐，外卖员送过去）

MCP 就是让 Claude（AI助手）能够直接"点餐"（调用你的八字算法），而不需要打开你的网站！

---

## 🗂️ 文件结构解释

```
harmony-name/
├── mcp/
│   └── server.ts          ← 这是"外卖员"（告诉 Claude 怎么点餐）
├── src/
│   └── lib/
│       └── bazi.ts        ← 这是"厨房"（真正的算法在这里）
└── claude_desktop_config.json  ← 这是"外卖平台"（告诉 Claude 去哪里找外卖员）
```

---

## 📝 代码逐行解释

### 1️⃣ `server.ts` - 外卖员的工作手册

#### 第一部分：准备工具
```typescript
import { calculateBazi } from "../src/lib/bazi";
```
**解释**：就像外卖员需要知道厨房在哪里，这里告诉程序"八字算法在 `../src/lib/bazi.ts` 这个文件里"

**路径说明**：
- `mcp/server.ts` 在 `mcp/` 文件夹
- `src/lib/bazi.ts` 在 `src/lib/` 文件夹
- `../` 意思是"上一级文件夹"
- 所以 `../src/lib/bazi` 就是从 `mcp/` 找到 `src/lib/bazi.ts`

#### 第二部分：创建服务器
```typescript
const server = new McpServer({
  name: "harmony-name-mcp",
  version: "1.0.0",
});
```
**解释**：就像给外卖员起个名字，告诉系统"我叫 harmony-name-mcp，版本是 1.0.0"

#### 第三部分：注册"菜单"（工具）
```typescript
server.tool(
  "calculate_bazi",  // 工具的名字（Claude 用这个名字来调用）
  "Calculate traditional Chinese BaZi...",  // 工具的描述（告诉 Claude 这个工具是干什么的）
  { ... }  // 工具需要什么参数（就像菜单上写"需要生日、时间"）
)
```

**参数解释**：
- `birthDate`: 生日（格式：1990-01-01）
- `birthTime`: 时间（格式：14:30 或 "unknown"）
- `longitude`: 经度（可选，用于精确计算）
- `timezone`: 时区（可选，比如 "America/New_York"）

#### 第四部分：执行计算
```typescript
const result = calculateBazi(birthDate, birthTime, city);
```
**解释**：就像外卖员去厨房拿菜，这里调用你的八字算法

#### 第五部分：返回结果
```typescript
return {
  content: [{ type: "text", text: JSON.stringify(...) }]
};
```
**解释**：把结果打包成 JSON 格式，送给 Claude

---

### 2️⃣ `claude_desktop_config.json` - 外卖平台的配置

```json
{
  "mcpServers": {
    "harmony-name": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/dengdan/Desktop/harmony-name/mcp/server.ts"]
    }
  }
}
```

**逐行解释**：

1. `"harmony-name"`: 这是服务的名字（可以随便起，但建议用项目名）

2. `"command": "npx"`: 
   - `npx` 是一个工具，可以临时下载并运行其他工具
   - 就像"临时雇佣一个翻译"

3. `"args"`: 这是传给 `npx` 的参数
   - `"-y"`: 自动确认（不要问"是否安装"，直接安装）
   - `"tsx"`: 要运行的工具（用来运行 TypeScript 文件）
   - `"/Users/dengdan/Desktop/harmony-name/mcp/server.ts"`: 要运行的文件路径

**⚠️ 重要**：路径必须是**绝对路径**（从 `/` 开始的完整路径）

---

## ✅ 检查清单

### server.ts 检查项：
- [x] ✅ 导入路径正确：`../src/lib/bazi`
- [x] ✅ 函数名正确：`calculateBazi`
- [x] ✅ 参数匹配：`(birthDate, birthTime, city)`
- [x] ✅ 有错误处理（try-catch）
- [x] ✅ 返回格式正确（MCP 格式）

### claude_desktop_config.json 检查项：
- [x] ✅ 路径是绝对路径
- [x] ✅ 路径指向正确的文件：`mcp/server.ts`
- [x] ✅ 使用 `npx tsx` 来运行 TypeScript

---

## 🧪 如何测试

### 方法1：手动测试 server.ts
```bash
cd /Users/dengdan/Desktop/harmony-name
npx -y tsx mcp/server.ts
```
如果看到 "HarmonyName MCP Server running on stdio"，说明代码没问题！

### 方法2：在 Claude Desktop 中测试
1. 重启 Claude Desktop（让配置生效）
2. 在聊天中问："帮我算一下 1990-01-01 12:00 的八字"
3. Claude 应该会自动调用你的工具

---

## 🐛 常见问题

### Q1: 路径错误怎么办？
**A**: 检查两点：
1. `server.ts` 中的 `../src/lib/bazi` 是否正确
2. `claude_desktop_config.json` 中的路径是否是绝对路径

### Q2: 找不到模块怎么办？
**A**: 确保安装了依赖：
```bash
npm install @modelcontextprotocol/sdk zod
```

### Q3: Claude 说找不到工具？
**A**: 
1. 检查配置文件路径是否正确
2. 重启 Claude Desktop
3. 查看 Claude Desktop 的日志（通常在控制台）

---

## 🎯 下一步学习

1. **添加更多工具**：比如 `get_lucky_names`（根据八字推荐名字）
2. **添加资源**：把诗词数据库作为资源暴露给 Claude
3. **优化错误处理**：让错误信息更友好

---

## 💡 小贴士

- **路径很重要**：相对路径 `../` 和绝对路径 `/Users/...` 要分清楚
- **错误处理**：永远用 `try-catch` 包裹可能出错的地方
- **测试先行**：先手动测试，再在 Claude 中测试
- **日志调试**：用 `console.error` 输出日志（MCP 中 stdout 用于通信，stderr 用于日志）

