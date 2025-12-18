# 🎤 中文语音播放功能实现说明

## 📋 功能概述

这个功能实现了自然的中文名字语音播放，当用户点击名字旁边的 🔊 图标时，会播放名字的发音。

## 🛠️ 技术实现

### 1. **核心文件**

- **`src/lib/tts.ts`** - 语音播放的核心工具函数
- **`src/app/app/page.tsx`** - 在名字卡片中集成语音播放功能

### 2. **使用的技术：Web Speech API**

我们使用了浏览器内置的 **Web Speech API**，这是最简单且无需额外配置的方案。

#### 什么是 Web Speech API？

Web Speech API 是浏览器提供的原生 API，包含两个主要部分：
- **Speech Recognition（语音识别）** - 将语音转换为文字
- **Speech Synthesis（语音合成）** - 将文字转换为语音（我们使用的部分）

### 3. **代码实现详解**

#### 3.1 检查浏览器支持

```typescript
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
```

**知识点：**
- `typeof window !== "undefined"` - 检查是否在浏览器环境（Next.js 是服务端渲染，需要检查）
- `"speechSynthesis" in window` - 检查浏览器是否支持语音合成 API

#### 3.2 创建语音播放函数

```typescript
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = "zh-CN";  // 设置语言为中文简体
utterance.pitch = 1.1;     // 音调（0-2）
utterance.rate = 0.9;      // 语速（0.1-10）
utterance.volume = 1;      // 音量（0-1）
```

**知识点：**
- `SpeechSynthesisUtterance` - 语音合成对象，包含要播放的文本和参数
- `lang` - 语言代码（ISO 639-1），`zh-CN` 表示中文简体
- `pitch` - 音调，1.1 表示稍微提高音调，让声音更自然
- `rate` - 语速，0.9 表示稍微放慢，更清晰
- `volume` - 音量，1 表示最大音量

#### 3.3 选择中文女声

```typescript
const voices = window.speechSynthesis.getVoices();
const chineseFemaleVoice = voices.find(
  (voice) =>
    voice.lang.startsWith("zh") &&
    (voice.name.includes("Female") || voice.name.includes("女"))
);
```

**知识点：**
- `getVoices()` - 获取浏览器支持的所有语音列表
- 不同浏览器和操作系统提供的语音不同
- Chrome 通常有较好的中文语音支持
- 我们优先选择中文女声，如果没有则选择任意中文语音

#### 3.4 异步播放处理

```typescript
return new Promise((resolve, reject) => {
  utterance.onend = () => resolve();
  utterance.onerror = (error) => reject(error);
  window.speechSynthesis.speak(utterance);
});
```

**知识点：**
- `Promise` - JavaScript 异步编程的核心
- `onend` - 播放完成时的回调函数
- `onerror` - 播放出错时的回调函数
- 使用 Promise 可以让调用者知道播放何时完成

#### 3.5 在 React 组件中使用

```typescript
const [playingNameIndex, setPlayingNameIndex] = useState<number | null>(null);

const handlePlayName = async (name: NameOption, index: number) => {
  setPlayingNameIndex(index);
  try {
    await speakChineseName(name.hanzi, name.pinyin);
  } finally {
    setPlayingNameIndex(null);
  }
};
```

**知识点：**
- `useState` - React Hook，用于管理组件状态
- `async/await` - 现代 JavaScript 异步编程语法
- 状态管理：通过 `playingNameIndex` 跟踪正在播放的名字，用于显示播放状态

## 📚 涉及的知识点总结

### 1. **Web APIs**
- **Web Speech API** - 浏览器原生语音合成 API
- **浏览器兼容性** - 不同浏览器支持程度不同

### 2. **JavaScript 核心概念**
- **Promise** - 异步操作的处理
- **async/await** - 异步代码的现代写法
- **事件处理** - `onend`、`onerror` 等事件回调

### 3. **React 概念**
- **useState Hook** - 状态管理
- **useEffect Hook** - 副作用处理（加载语音列表）
- **事件处理** - `onClick` 事件绑定

### 4. **TypeScript**
- **类型定义** - 为函数参数和返回值定义类型
- **接口（Interface）** - 定义数据结构

### 5. **Next.js 特性**
- **服务端渲染（SSR）** - 需要检查 `typeof window` 确保在浏览器环境
- **客户端组件** - 使用 `"use client"` 指令

## 🎯 功能特点

1. **自然的中文发音** - 使用浏览器内置的中文语音引擎
2. **智能语音选择** - 自动选择中文女声（如果可用）
3. **播放状态反馈** - 播放时图标会有动画效果
4. **错误处理** - 如果浏览器不支持，会优雅降级
5. **可停止播放** - 点击正在播放的图标可以停止

## 🚀 如何升级到更自然的语音（可选）

如果 Web Speech API 的语音不够自然，可以考虑以下方案：

### 方案 1: Azure Cognitive Services TTS
- **优点**：语音质量极高，有多种自然的中文女声
- **缺点**：需要 API Key，有使用费用
- **实现**：需要调用 Azure TTS API，返回音频流

### 方案 2: 百度 TTS API
- **优点**：中文语音质量好，有免费额度
- **缺点**：需要注册百度账号
- **实现**：调用百度 TTS API

### 方案 3: 讯飞 TTS
- **优点**：中文语音质量优秀
- **缺点**：需要注册账号
- **实现**：调用讯飞 TTS API

## 💡 学习建议

1. **理解异步编程** - Promise 和 async/await 是现代 JavaScript 的核心
2. **掌握 React Hooks** - useState 和 useEffect 是最常用的 Hooks
3. **了解浏览器 API** - Web Speech API 是浏览器提供的强大功能
4. **错误处理** - 总是要考虑错误情况，提供降级方案

## 🔍 调试技巧

1. **查看可用语音**：
   ```javascript
   console.log(window.speechSynthesis.getVoices());
   ```

2. **测试语音播放**：
   ```javascript
   const utterance = new SpeechSynthesisUtterance("你好");
   utterance.lang = "zh-CN";
   window.speechSynthesis.speak(utterance);
   ```

3. **检查浏览器支持**：
   ```javascript
   console.log("支持语音合成:", "speechSynthesis" in window);
   ```

## 📝 注意事项

1. **浏览器兼容性**：
   - Chrome/Edge: ✅ 完全支持
   - Safari: ✅ 支持（但语音选择较少）
   - Firefox: ⚠️ 部分支持
   - 移动端浏览器: ✅ 大部分支持

2. **语音列表加载**：
   - 某些浏览器需要触发 `getVoices()` 才能加载语音列表
   - 我们使用 `onvoiceschanged` 事件确保语音列表加载完成

3. **用户体验**：
   - 播放时显示加载状态，让用户知道正在播放
   - 可以点击停止当前播放
   - 如果浏览器不支持，不会报错，只是功能不可用

