// lib/surnames.ts
export type WuxingEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export interface CommonSurname {
  chinese: string;
  english: string; // 带声调的拼音
  wuxing: WuxingEN;
  meaning: string;
}

export const COMMON_SURNAMES: CommonSurname[] = [
  { chinese: '白', english: 'Bái', wuxing: 'Metal', meaning: 'White' },
  { chinese: '蔡', english: 'Cài', wuxing: 'Wood', meaning: 'Surname origin' },
  { chinese: '曹', english: 'Cáo', wuxing: 'Metal', meaning: 'Stable' },
  { chinese: '常', english: 'Cháng', wuxing: 'Metal', meaning: 'Constant' },
  { chinese: '陈', english: 'Chén', wuxing: 'Fire', meaning: 'To display' },
  { chinese: '程', english: 'Chéng', wuxing: 'Fire', meaning: 'Procedure' },
  { chinese: '池', english: 'Chí', wuxing: 'Water', meaning: 'Pool' },
  { chinese: '楚', english: 'Chǔ', wuxing: 'Wood', meaning: 'Clear' },
  { chinese: '戴', english: 'Dài', wuxing: 'Fire', meaning: 'To wear' },
  { chinese: '邓', english: 'Dèng', wuxing: 'Fire', meaning: 'Ancient state' },
  { chinese: '丁', english: 'Dīng', wuxing: 'Fire', meaning: 'Nail' },
  { chinese: '董', english: 'Dǒng', wuxing: 'Wood', meaning: 'To supervise' },
  { chinese: '窦', english: 'Dòu', wuxing: 'Fire', meaning: 'Cave' },
  { chinese: '杜', english: 'Dù', wuxing: 'Wood', meaning: 'To prevent' },
  { chinese: '范', english: 'Fàn', wuxing: 'Water', meaning: 'Model' },
  { chinese: '方', english: 'Fāng', wuxing: 'Water', meaning: 'Square' },
  { chinese: '冯', english: 'Féng', wuxing: 'Water', meaning: 'Ice' },
  { chinese: '傅', english: 'Fù', wuxing: 'Water', meaning: 'Teacher' },
  { chinese: '高', english: 'Gāo', wuxing: 'Wood', meaning: 'Tall' },
  { chinese: '桂', english: 'Guì', wuxing: 'Wood', meaning: 'Osmanthus' },
  { chinese: '郭', english: 'Guō', wuxing: 'Wood', meaning: 'Outer wall' },
  { chinese: '海', english: 'Hǎi', wuxing: 'Water', meaning: 'Sea' },
  { chinese: '韩', english: 'Hán', wuxing: 'Water', meaning: 'Ancient state' },
  { chinese: '何', english: 'Hé', wuxing: 'Wood', meaning: 'What' },
  { chinese: '贺', english: 'Hè', wuxing: 'Water', meaning: 'To congratulate' },
  { chinese: '洪', english: 'Hóng', wuxing: 'Water', meaning: 'Flood' },
  { chinese: '胡', english: 'Hú', wuxing: 'Earth', meaning: 'Barbarian' },
  { chinese: '黄', english: 'Huáng', wuxing: 'Earth', meaning: 'Yellow' },
  { chinese: '贾', english: 'Jiǎ', wuxing: 'Water', meaning: 'Merchant' },
  { chinese: '姜', english: 'Jiāng', wuxing: 'Wood', meaning: 'Ginger' },
  { chinese: '江', english: 'Jiāng', wuxing: 'Water', meaning: 'River' },
  { chinese: '蒋', english: 'Jiǎng', wuxing: 'Wood', meaning: 'Surname origin' },
  { chinese: '金', english: 'Jīn', wuxing: 'Metal', meaning: 'Gold' },
  { chinese: '孔', english: 'Kǒng', wuxing: 'Wood', meaning: 'Hole' },
  { chinese: '李', english: 'Lǐ', wuxing: 'Fire', meaning: 'Plum tree' },
  { chinese: '梁', english: 'Liáng', wuxing: 'Wood', meaning: 'Bridge' },
  { chinese: '林', english: 'Lín', wuxing: 'Wood', meaning: 'Forest' },
  { chinese: '刘', english: 'Liú', wuxing: 'Metal', meaning: 'Battle axe' },
  { chinese: '柳', english: 'Liǔ', wuxing: 'Wood', meaning: 'Willow' },
  { chinese: '卢', english: 'Lú', wuxing: 'Fire', meaning: 'Ancient vessel' },
  { chinese: '罗', english: 'Luó', wuxing: 'Fire', meaning: 'Silk gauze' },
  { chinese: '吕', english: 'Lǚ', wuxing: 'Fire', meaning: 'Ancient state name' },
  { chinese: '马', english: 'Mǎ', wuxing: 'Water', meaning: 'Horse' },
  { chinese: '毛', english: 'Máo', wuxing: 'Water', meaning: 'Hair' },
  { chinese: '梅', english: 'Méi', wuxing: 'Wood', meaning: 'Plum' },
  { chinese: '木', english: 'Mù', wuxing: 'Wood', meaning: 'Wood' },
  { chinese: '潘', english: 'Pān', wuxing: 'Water', meaning: 'Water bank' },
  { chinese: '彭', english: 'Péng', wuxing: 'Water', meaning: 'Drumbeat' },
  { chinese: '戚', english: 'Qī', wuxing: 'Fire', meaning: 'Relative' },
  { chinese: '钱', english: 'Qián', wuxing: 'Metal', meaning: 'Money' },
  { chinese: '秦', english: 'Qín', wuxing: 'Fire', meaning: 'Dynasty name' },
  { chinese: '任', english: 'Rén', wuxing: 'Metal', meaning: 'To bear' },
  { chinese: '申', english: 'Shēn', wuxing: 'Metal', meaning: 'To extend' },
  { chinese: '沈', english: 'Shěn', wuxing: 'Water', meaning: 'To sink' },
  { chinese: '史', english: 'Shǐ', wuxing: 'Metal', meaning: 'History' },
  { chinese: '石', english: 'Shí', wuxing: 'Metal', meaning: 'Stone' },
  { chinese: '水', english: 'Shuǐ', wuxing: 'Water', meaning: 'Water' },
  { chinese: '司', english: 'Sī', wuxing: 'Metal', meaning: 'To manage' },
  { chinese: '宋', english: 'Sòng', wuxing: 'Metal', meaning: 'Dynasty name' },
  { chinese: '松', english: 'Sōng', wuxing: 'Wood', meaning: 'Pine tree' },
  { chinese: '苏', english: 'Sū', wuxing: 'Wood', meaning: 'Perilla plant' },
  { chinese: '孙', english: 'Sūn', wuxing: 'Metal', meaning: 'Grandchild' },
  { chinese: '覃', english: 'Tán', wuxing: 'Wood', meaning: 'Deep' },
  { chinese: '唐', english: 'Táng', wuxing: 'Fire', meaning: 'Dynasty name' },
  { chinese: '陶', english: 'Táo', wuxing: 'Fire', meaning: 'Pottery' },
  { chinese: '滕', english: 'Téng', wuxing: 'Fire', meaning: 'To rise' },
  { chinese: '田', english: 'Tián', wuxing: 'Fire', meaning: 'Field' },
  { chinese: '汪', english: 'Wāng', wuxing: 'Water', meaning: 'Deep pool' },
  { chinese: '王', english: 'Wáng', wuxing: 'Earth', meaning: 'King' },
  { chinese: '韦', english: 'Wéi', wuxing: 'Earth', meaning: 'Leather' },
  { chinese: '魏', english: 'Wèi', wuxing: 'Wood', meaning: 'Ancient kingdom' },
  { chinese: '文', english: 'Wén', wuxing: 'Water', meaning: 'Literature' },
  { chinese: '武', english: 'Wǔ', wuxing: 'Water', meaning: 'Military' },
  { chinese: '吴', english: 'Wú', wuxing: 'Wood', meaning: 'Ancient state' },
  { chinese: '肖', english: 'Xiāo', wuxing: 'Wood', meaning: 'Similar' },
  { chinese: '向', english: 'Xiàng', wuxing: 'Water', meaning: 'Towards' },
  { chinese: '谢', english: 'Xiè', wuxing: 'Metal', meaning: 'To thank' },
  { chinese: '徐', english: 'Xú', wuxing: 'Metal', meaning: 'Slowly' },
  { chinese: '许', english: 'Xǔ', wuxing: 'Wood', meaning: 'To permit' },
  { chinese: '薛', english: 'Xuē', wuxing: 'Wood', meaning: 'Wormwood' },
  { chinese: '严', english: 'Yán', wuxing: 'Wood', meaning: 'Strict' },
  { chinese: '杨', english: 'Yáng', wuxing: 'Wood', meaning: 'Poplar tree' },
  { chinese: '叶', english: 'Yè', wuxing: 'Earth', meaning: 'Leaf' },
  { chinese: '易', english: 'Yì', wuxing: 'Fire', meaning: 'Easy' },
  { chinese: '尹', english: 'Yǐn', wuxing: 'Earth', meaning: 'To govern' },
  { chinese: '于', english: 'Yú', wuxing: 'Earth', meaning: 'In' },
  { chinese: '余', english: 'Yú', wuxing: 'Earth', meaning: 'Surplus' },
  { chinese: '喻', english: 'Yù', wuxing: 'Metal', meaning: 'To metaphor' },
  { chinese: '袁', english: 'Yuán', wuxing: 'Earth', meaning: 'Long robe' },
  { chinese: '云', english: 'Yún', wuxing: 'Water', meaning: 'Cloud' },
  { chinese: '曾', english: 'Zēng', wuxing: 'Metal', meaning: 'Great-grand' },
  { chinese: '张', english: 'Zhāng', wuxing: 'Fire', meaning: 'To stretch a bow' },
  { chinese: '章', english: 'Zhāng', wuxing: 'Fire', meaning: 'Chapter' },
  { chinese: '赵', english: 'Zhào', wuxing: 'Fire', meaning: 'To surpass' },
  { chinese: '郑', english: 'Zhèng', wuxing: 'Fire', meaning: 'Serious' },
  { chinese: '钟', english: 'Zhōng', wuxing: 'Metal', meaning: 'Bell' },
  { chinese: '周', english: 'Zhōu', wuxing: 'Metal', meaning: 'Circumference' },
  { chinese: '朱', english: 'Zhū', wuxing: 'Fire', meaning: 'Vermillion' },
  { chinese: '邹', english: 'Zōu', wuxing: 'Metal', meaning: 'Ancient state' },
];

// 去掉声调，统一小写，方便用 "liu" 匹配 "Liú"
export function normalizePinyin(input: string): string {
  return input
    .normalize('NFD') // 分解声调
    .replace(/[\u0300-\u036f]/g, '') // 去掉声调符号
    .toLowerCase()
    .trim();
}

// 带拼音容错的搜索：支持中文 + 无声调拼音
export function searchSurnames(query: string): CommonSurname[] {
  const q = query.trim();
  if (!q) return COMMON_SURNAMES;

  const qNormalized = normalizePinyin(q);

  return COMMON_SURNAMES.filter((s) => {
    const cnMatch = s.chinese.includes(q);
    const enNormalized = normalizePinyin(s.english);
    return cnMatch || enNormalized.includes(qNormalized);
  });
}

// 五行标签颜色
export const getWuxingColor = (wuxing: WuxingEN) => {
  const colors: Record<WuxingEN, string> = {
    Wood: 'text-green-700 bg-green-50',
    Fire: 'text-red-600 bg-red-50',
    Earth: 'text-amber-700 bg-amber-50',
    Metal: 'text-yellow-700 bg-yellow-50',
    Water: 'text-blue-700 bg-blue-50',
  };
  return colors[wuxing] ?? 'text-gray-700 bg-gray-50';
};
