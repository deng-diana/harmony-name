import { z } from "zod";

// 五行枚举 —— dayMaster / 喜忌都只可能是这五个,用 enum 既校验又防注入。
const ELEMENT = z.enum(["Wood", "Fire", "Earth", "Metal", "Water"]);

// 安全要点:本 schema 的字段会进入发给 Claude 的 prompt(姓氏、喜忌、强弱…),
// 所以全部【收紧】—— 枚举锁定取值、字符串限长 + 限字符集,堵死两类风险:
//   ① prompt 注入:specifiedSurname 曾以裸字符串拼进 prompt,可塞"忽略以上指令…"
//   ② 烧钱:无界数组/超长串可放大 token 用量(限流 10/min 仍是真实花费)
export const generateRequestSchema = z.object({
  gender: z.enum(["male", "female"]),
  dayMaster: ELEMENT,
  strength: z.enum(["Weak", "Strong", "Balanced"]),
  favourableElements: z.array(ELEMENT).max(5),
  avoidElements: z.array(ELEMENT).max(5).optional().default([]),
  surnamePreference: z.enum(["auto", "specified", "from_common"]).default("auto"),
  // 姓:最多 2 字(含复姓)、仅汉字 —— 这是进 prompt 的最大注入面,锁死。
  specifiedSurname: z
    .string()
    .max(2)
    .regex(/^[一-鿿]*$/, "surname must be Chinese characters")
    .default(""),
  recommendedNameLength: z.string().max(40),
  // 以下仅用于归档(不进 prompt),轻度限长防垃圾入库。
  wuxing: z
    .object({
      gold: z.number().int().min(0).max(20),
      wood: z.number().int().min(0).max(20),
      water: z.number().int().min(0).max(20),
      fire: z.number().int().min(0).max(20),
      earth: z.number().int().min(0).max(20),
    })
    .optional(),
  bazi: z
    .object({
      year: z.string().max(6),
      month: z.string().max(6),
      day: z.string().max(6),
      hour: z.string().max(6),
    })
    .optional(),
});
