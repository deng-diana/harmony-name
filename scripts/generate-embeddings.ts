import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

// 加载环境变量 (因为脚本不在 Next.js 环境下运行，需要手动加载)
dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1. 读取原始诗词
const poems = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts/poems.json"), "utf8")
);

async function generateEmbeddings() {
  console.log(`🔥 Starting vectorization for ${poems.length} poems...`);

  const processedPoems = [];

  for (const poem of poems) {
    // 我们把 标题+内容+标签 组合在一起，变成一段话，让 AI 理解它的含义
    const textToEmbed = `${poem.title} ${poem.dynasty} ${poem.author}: ${
      poem.content
    } Keywords: ${poem.tags.join(", ")}`;

    try {
      // 2. 调用 OpenAI 把它变成向量 (Vector)
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // 专门用来做搜索的模型，又快又便宜
        input: textToEmbed,
        encoding_format: "float",
      });

      const embedding = response.data[0].embedding;

      // 3. 把向量存进对象里
      processedPoems.push({
        ...poem,
        embedding, // 👈 这就是它的“GPS坐标”
      });

      console.log(`✅ Processed: ${poem.title}`);
    } catch (error) {
      console.error(`❌ Failed: ${poem.title}`, error);
    }
  }

  // 4. 保存到一个新文件：数据库！
  // 这里的 'lib' 指的是项目根目录下的 lib 文件夹
  // 如果你的 lib 在 src 里面，就改成 'src/lib'
  const outputDir = path.join(process.cwd(), "src/lib");
  const outputPath = path.join(outputDir, "poems-db.json");

  // 🛡️ 保险丝：如果文件夹不存在，就自动建一个！
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(processedPoems, null, 2));

  console.log(`🎉 Success! Database saved to ${outputPath}`);
}

generateEmbeddings();
