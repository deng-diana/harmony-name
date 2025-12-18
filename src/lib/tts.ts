/**
 * 中文语音播放工具 (TTS - Text-to-Speech)
 *
 * 这个文件实现了自然的中文语音播放功能
 * 使用浏览器的 Web Speech API 作为基础方案
 */

// 检查浏览器是否支持 Web Speech API
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * 获取中文女声（优先选择）
 * 等待语音列表加载完成后再选择
 */
function getChineseFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();

  // 更全面的中文女声匹配规则
  const femaleKeywords = [
    "Female",
    "女",
    "Ting-Ting",
    "Sin-Ji",
    "Xiaoxiao", // Azure 中文女声
    "Xiaoyi", // Azure 中文女声
    "Xiaoxuan", // Azure 中文女声
    "Xiaomo", // Azure 中文女声
    "Xiaoxian", // Azure 中文女声
  ];

  // 优先查找明确标注为女声的中文语音
  let chineseFemaleVoice = voices.find(
    (voice) =>
      voice.lang.startsWith("zh") &&
      femaleKeywords.some((keyword) => voice.name.includes(keyword))
  );

  // 如果没有找到，尝试通过语音名称判断（某些浏览器不标注 Female）
  if (!chineseFemaleVoice) {
    // 某些中文语音名称中包含女声特征
    chineseFemaleVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("zh") &&
        (voice.name.toLowerCase().includes("ting") ||
          voice.name.toLowerCase().includes("xiao") ||
          voice.name.toLowerCase().includes("mei"))
    );
  }

  return chineseFemaleVoice || null;
}

/**
 * 使用 Web Speech API 播放中文语音（强制使用女声）
 * @param text 要播放的中文文本（汉字）
 * @param options 语音选项
 */
export function speakWithWebAPI(
  text: string,
  options: {
    lang?: string; // 语言代码，如 'zh-CN'（中文简体）
    pitch?: number; // 音调 (0-2，默认1)
    rate?: number; // 语速 (0.1-10，默认1)
    volume?: number; // 音量 (0-1，默认1)
    voice?: SpeechSynthesisVoice; // 指定的语音
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error("浏览器不支持语音合成功能"));
      return;
    }

    // 停止当前正在播放的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语言（中文简体）
    utterance.lang = options.lang || "zh-CN";

    // 设置语音参数 - 调整为更适合女声的参数
    utterance.pitch = options.pitch ?? 1.2; // 提高音调，更接近女声
    utterance.rate = options.rate ?? 0.9; // 稍微放慢语速，更清晰
    utterance.volume = options.volume ?? 1;

    // 强制选择中文女声
    if (!options.voice) {
      const femaleVoice = getChineseFemaleVoice();

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        // 如果找不到女声，选择任意中文语音，但提高音调模拟女声
        const chineseVoice = window.speechSynthesis
          .getVoices()
          .find((voice) => voice.lang.startsWith("zh"));

        if (chineseVoice) {
          utterance.voice = chineseVoice;
          // 进一步提高音调以模拟女声
          utterance.pitch = 1.3;
        }
      }
    } else {
      utterance.voice = options.voice;
    }

    // 播放完成后的回调
    utterance.onend = () => {
      resolve();
    };

    // 错误处理
    utterance.onerror = (error) => {
      reject(error);
    };

    // 开始播放
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 播放中文名字（仅播放汉字，使用女声）
 * @param hanzi 中文名字（如 "邓清流"）
 */
export async function speakChineseName(hanzi: string): Promise<void> {
  // 只播放中文汉字，使用女声
  await speakWithWebAPI(hanzi, {
    lang: "zh-CN",
    pitch: 1.2, // 提高音调，更接近女声
    rate: 0.9, // 适中的语速
  });
}

/**
 * 停止当前播放的语音
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 获取可用的中文语音列表（用于调试或选择）
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) {
    return [];
  }
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.startsWith("zh"));
}
