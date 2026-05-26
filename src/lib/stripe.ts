/**
 * Stripe 服务端客户端。没配 STRIPE_SECRET_KEY 时为 null → 支付接口优雅报错。
 */
import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
