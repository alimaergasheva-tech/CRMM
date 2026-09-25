import { jsonError, parseJson } from "@/lib/api";
import { formatPost, parseStreamingVariants } from "@/lib/content-parse";
import { buildPrompt, geminiModel, getGemini, variantSchema } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import { SOCIAL_PLATFORMS, type ContentPost, type SocialPlatform } from "@/types/crm.types";

export const runtime = "nodejs";

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function savePosts(
  userId: string,
  platform: SocialPlatform,
  topic: string,
  posts: ContentPost[],
) {
  await ensureSchema();
  const db = getTurso();
  const now = new Date().toISOString();
  for (const post of posts) {
    await db.execute({
      sql: `insert into generated_posts
            (id, user_id, platform, topic, title, body, cta, hashtags, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        platform,
        topic,
        post.title,
        post.body,
        post.cta,
        JSON.stringify(post.hashtags),
        now,
      ],
    });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await parseJson<{
    topic?: string;
    platform?: SocialPlatform;
    regenerate?: boolean;
    avoidTitles?: string[];
  }>(request);

  const topic = body?.topic?.trim() ?? "";
  const platform = body?.platform;
  if (topic.length < 3) return jsonError("Опишите тему подробнее", 400);
  if (!platform || !SOCIAL_PLATFORMS.includes(platform)) {
    return jsonError("Выберите площадку", 400);
  }

  let ai;
  try {
    ai = getGemini();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Gemini недоступен", 500);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(sse(payload)));
      };

      try {
        const responseStream = await ai.models.generateContentStream({
          model: geminiModel(),
          contents: buildPrompt({
            topic,
            platform,
            regenerate: Boolean(body?.regenerate),
            avoidTitles: Array.isArray(body?.avoidTitles) ? body.avoidTitles.slice(0, 12) : [],
          }),
          config: {
            responseMimeType: "application/json",
            responseSchema: variantSchema,
            temperature: body?.regenerate ? 1.1 : 0.9,
          },
        });

        let buffer = "";
        let emitted = 0;

        for await (const chunk of responseStream) {
          if (request.signal.aborted) break;
          const text = chunk.text ?? "";
          if (!text) continue;
          buffer += text;
          send({ type: "delta", text });

          const parsed = parseStreamingVariants(buffer);
          while (emitted < parsed.complete.length) {
            send({ type: "variant", index: emitted, post: parsed.complete[emitted] });
            emitted += 1;
          }
          if (parsed.partial) {
            send({ type: "partial", post: parsed.partial });
          }
        }

        const finalParsed = parseStreamingVariants(buffer);
        const posts = finalParsed.complete.slice(0, 3);
        if (posts.length === 0) {
          send({ type: "error", message: "Модель не вернула посты. Попробуйте ещё раз." });
          controller.close();
          return;
        }

        await savePosts(user.id, platform, topic, posts);
        send({
          type: "done",
          posts,
          preview: posts.map(formatPost),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка генерации";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
