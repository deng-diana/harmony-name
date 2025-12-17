import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🎯 现在的源头是本地文件 (Local Files)
const SOURCES = [
  {
    name: "Tang Poems",
    path: "src/data/tang.json", // 👈 指向 src/data 下的文件
    type: "Tang"
  },
  {
    name: "Song Ci",
    path: "src/data/song.json",
    type: "Song"
  },
  {
    name: "Shijing",
    path: "src/data/shijing.json",
    type: "Classic"
  }
];

interface RawPoem {
  title?: string;
  rhythmic?: string;
  author: string;
  paragraphs?: string[];
  content?: string[];
}

interface ProcessedPoem {
  title: string;
  author: string;
  dynasty: string;
  content: string;
  embedding: number[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function buildLibrary() {
  console.log("🚀 Starting Local Data Processing...");
  
  let allPoems: ProcessedPoem[] = [];

  for (const source of SOURCES) {
    console.log(`📖 Reading ${source.name}...`);
    
    try {
      // 1. 读取本地文件
      const filePath = path.join(process.cwd(), source.path);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const rawData = JSON.parse(fileContent) as RawPoem[];
      
      console.log(`   Loaded ${rawData.length} poems.`);

      // 2. 数据清洗 (取前 50 首做 MVP，省钱且快)
      // ⚠️ 注意：正式版可以去掉 .slice(0, 50)
      const cleanData = rawData.slice(0, 50).map(item => {
        const title = item.title || item.rhythmic || "Unknown";
        const lines = item.paragraphs || item.content || [];
        const content = lines.join("，");
        
        return {
          title,
          author: item.author || 'Unknown',
          dynasty: source.type,
          content
        };
      }).filter(p => p.content.length > 10);

      // 3. 向量化 (Vectorization)
      for (const [index, poem] of cleanData.entries()) {
        try {
          const textToEmbed = `Title:${poem.title} Author:${poem.author} Content:${poem.content}`;
          
          const embeddingResp = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: textToEmbed,
            encoding_format: "float",
          });

          allPoems.push({
            ...poem,
            embedding: embeddingResp.data[0].embedding
          });

          process.stdout.write(`\r   ✨ Vectorizing... ${index + 1}/${cleanData.length}`);
          await sleep(20); // 稍微快一点，因为不用网络下载了

        } catch (error) {
          console.warn(`\n   ⚠️ Skipped "${poem.title}"`);
        }
      }
      console.log("\n   ✅ Source done.");

    } catch (err) {
      console.error(`❌ Error reading ${source.path}. Did you create the file?`, err);
    }
  }

  // 4. 保存数据库
  const outputDir = path.join(process.cwd(), 'src/lib');
  const outputPath = path.join(outputDir, 'poems-db.json');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allPoems, null, 2));

  console.log(`\n🎉 DATABASE BUILD COMPLETE! Total Poems: ${allPoems.length}`);
  console.log(`📂 Saved to: ${outputPath}`);
}

buildLibrary();