import { z } from "zod";

export const generateRequestSchema = z.object({
  gender: z.enum(["male", "female"]),
  dayMaster: z.string(),
  strength: z.string(),
  favourableElements: z.array(z.string()),
  avoidElements: z.array(z.string()).optional().default([]),
  surnamePreference: z.string().default("auto"),
  specifiedSurname: z.string().default(""),
  recommendedNameLength: z.string(),
  wuxing: z
    .object({
      gold: z.number(),
      wood: z.number(),
      water: z.number(),
      fire: z.number(),
      earth: z.number(),
    })
    .optional(),
  bazi: z
    .object({
      year: z.string(),
      month: z.string(),
      day: z.string(),
      hour: z.string(),
    })
    .optional(),
});

export const gptRequestSchema = z.object({
  birthDate: z.string(),
  birthTime: z.string().default("unknown"),
  gender: z.enum(["male", "female"]).default("male"),
  surnamePreference: z.string().default("auto"),
  specifiedSurname: z.string().default(""),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
});
