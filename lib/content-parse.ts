import type { ContentPost } from "@/types/crm.types";

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function extractField(src: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const match = src.match(re);
  if (!match) return undefined;
  return unescapeJsonString(match[1]);
}

function extractHashtags(src: string): string[] | undefined {
  const match = src.match(/"hashtags"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (!match) return undefined;
  return [...match[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((item) =>
    unescapeJsonString(item[1]),
  );
}

export function isCompletePost(post: Partial<ContentPost>): post is ContentPost {
  return Boolean(
    post.title &&
      post.body &&
      post.cta &&
      Array.isArray(post.hashtags) &&
      post.hashtags.length > 0,
  );
}

export function normalizePost(post: ContentPost): ContentPost {
  return {
    title: String(post.title).trim(),
    body: String(post.body).trim(),
    cta: String(post.cta).trim(),
    hashtags: post.hashtags.map((tag) => {
      const cleaned = String(tag).trim().replace(/^#+/, "");
      return cleaned ? `#${cleaned}` : "";
    }).filter(Boolean),
  };
}

export function formatPost(post: ContentPost): string {
  return [post.title, "", post.body, "", post.cta, "", post.hashtags.join(" ")]
    .join("\n")
    .trim();
}

export function parseStreamingVariants(buffer: string): {
  complete: ContentPost[];
  partial: Partial<ContentPost> | null;
} {
  const trimmed = buffer.trim();
  try {
    const parsed = JSON.parse(trimmed) as { variants?: ContentPost[] };
    if (Array.isArray(parsed.variants)) {
      return {
        complete: parsed.variants.filter(isCompletePost).map(normalizePost),
        partial: null,
      };
    }
  } catch {
    // JSON ещё не закрыт — разбираем по объектам
  }

  const arrayStart = buffer.indexOf("[");
  if (arrayStart === -1) return { complete: [], partial: null };

  const slice = buffer.slice(arrayStart);
  const complete: ContentPost[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;

  for (let i = 0; i < slice.length; i += 1) {
    const ch = slice[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          const obj = JSON.parse(slice.slice(start, i + 1)) as ContentPost;
          if (isCompletePost(obj)) complete.push(normalizePost(obj));
        } catch {
          // объект ещё битый
        }
        start = -1;
      }
    }
  }

  let partial: Partial<ContentPost> | null = null;
  if (start !== -1) {
    const frag = slice.slice(start);
    const title = extractField(frag, "title");
    const body = extractField(frag, "body");
    const cta = extractField(frag, "cta");
    const hashtags = extractHashtags(frag);
    if (title || body || cta || hashtags?.length) {
      partial = { title, body, cta, hashtags };
    }
  }

  return { complete, partial };
}
