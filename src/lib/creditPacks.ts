/**
 * 积分包定义(单一可信来源)。
 * 用代码内联定价(price_data),不依赖 Stripe 后台手动建商品 —— 改价改包只动这里。
 * amount 单位是「分」(美分);currency 见 /api/checkout。
 */
export interface CreditPack {
  id: string;
  credits: number;
  amount: number; // 美分
  label: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 10, amount: 500, label: "Starter" },   // $5  → 10 names
  { id: "popular", credits: 30, amount: 1200, label: "Popular" },  // $12 → 30 names
  { id: "pro", credits: 100, amount: 3000, label: "Pro" },         // $30 → 100 names
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
