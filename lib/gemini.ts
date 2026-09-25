import { GoogleGenAI, Type } from "@google/genai";
import type { SocialPlatform } from "@/types/crm.types";

const PLATFORM_BRIEF: Record<SocialPlatform, string> = {
  telegram: `Telegram: живой тон, можно эмодзи. Заголовок — первая строка (до 80 символов). Текст 400–900 знаков, абзацы короткие. CTA — одно действие (подписаться, написать, перейти). Хэштеги 0–3, уместные.`,
  youtube: `YouTube: заголовок кликабельный, до 70 символов, без кликбейта. Текст — описание ролика 800–1500 знаков: о чём выпуск, таймкоды если уместны, ключевые слова. CTA — смотреть / подписаться / написать в комментарии. Хэштеги 3–5.`,
  instagram: `Instagram: хук в первой строке заголовка. Текст 500–1200 знаков, воздух между абзацами. CTA конкретный. Хэштеги 8–12, смесь широких и нишевых, без пробелов внутри тега.`,
};

let client: GoogleGenAI | null = null;

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Не задан GEMINI_API_KEY");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

export const variantSchema = {
  type: Type.OBJECT,
  properties: {
    variants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          body: { type: Type.STRING },
          cta: { type: Type.STRING },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["title", "body", "cta", "hashtags"],
      },
    },
  },
  required: ["variants"],
};

export function buildPrompt(input: {
  topic: string;
  platform: SocialPlatform;
  regenerate?: boolean;
  avoidTitles?: string[];
}) {
  const avoid =
    input.avoidTitles && input.avoidTitles.length > 0
      ? `\nНе повторяй эти заголовки: ${input.avoidTitles.join(" | ")}.`
      : "";
  const regen = input.regenerate
    ? "Это перегенерация: дай совершенно другие углы, формулировки и CTA."
    : "";

  return `Ты копирайтер SMM. Сгенерируй ровно 3 разных готовых поста на русском.

Площадка: ${input.platform}
Бриф площадки: ${PLATFORM_BRIEF[input.platform]}

Тема / бизнес / идея:
${input.topic}

${regen}${avoid}

Требования:
- variants.length === 3
- варианты отличаются по углу (польза / история / провокация или вопрос)
- без воды, без «как ИИ», без markdown
- hashtags — массив строк`;
}
