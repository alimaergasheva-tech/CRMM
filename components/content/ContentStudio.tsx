"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { formatPost } from "@/lib/content-parse";
import { useOnMount } from "@/lib/useOnMount";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  type ContentPost,
  type GeneratedPostRecord,
  type SocialPlatform,
} from "@/types/crm.types";

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "variant"; index: number; post: ContentPost }
  | { type: "partial"; post: Partial<ContentPost> }
  | { type: "done"; posts: ContentPost[] }
  | { type: "error"; message: string };

export function ContentStudio() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("telegram");
  const [variants, setVariants] = useState<(ContentPost | Partial<ContentPost> | null)[]>([
    null,
    null,
    null,
  ]);
  const [selected, setSelected] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<GeneratedPostRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/content/history");
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
  }, []);

  useOnMount(loadHistory);

  const selectedPost = variants[selected];
  const completePosts = useMemo(
    () => variants.filter((v): v is ContentPost => Boolean(v && v.title && v.body && v.cta && v.hashtags)),
    [variants],
  );

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
  }

  async function generate(regenerate: boolean) {
    if (streaming) return;
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError("Напишите тему или описание бизнеса");
      return;
    }

    setError("");
    setStreaming(true);
    setVariants([null, null, null]);
    setSelected(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic: trimmed,
          platform,
          regenerate,
          avoidTitles: regenerate ? completePosts.map((p) => p.title) : [],
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Не удалось запустить генерацию");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rest = "";
      const next = [null, null, null] as (ContentPost | Partial<ContentPost> | null)[];
      let nextIndex = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        rest += decoder.decode(value, { stream: true });
        const parts = rest.split("\n\n");
        rest = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line.slice(6)) as StreamEvent;
          } catch {
            continue;
          }

          if (event.type === "variant") {
            next[event.index] = event.post;
            nextIndex = Math.min(event.index + 1, 2);
            setVariants([...next]);
            setSelected(event.index);
          } else if (event.type === "partial") {
            next[nextIndex] = event.post;
            setVariants([...next]);
            setSelected(nextIndex);
          } else if (event.type === "done") {
            const filled = [...event.posts];
            while (filled.length < 3) filled.push(event.posts[0]);
            setVariants(filled.slice(0, 3));
            setSelected(0);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }

      await loadHistory();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Сеть недоступна или генерация прервалась");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div>
      <TopBar title="Контент" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <label className="block text-sm text-[var(--muted)]" htmlFor="topic">
              Тема, бизнес или идея
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={5}
              placeholder="Например: пекарня в Казани, утренний хлеб на закваске, доставка к 8:00"
              className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />

            <p className="mt-4 text-sm text-[var(--muted)]">Площадка</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPlatform(item)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    platform === item
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-white text-[var(--ink)]"
                  }`}
                >
                  {SOCIAL_PLATFORM_LABELS[item]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={streaming}
                onClick={() => void generate(false)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {streaming ? "Пишем…" : "Сгенерировать 3 варианта"}
              </button>
              <button
                type="button"
                disabled={streaming || completePosts.length === 0}
                onClick={() => void generate(true)}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm disabled:opacity-60"
              >
                Другие варианты
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
          </section>

          <div className="mt-4 flex gap-2">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelected(index)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                  selected === index
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                Вариант {index + 1}
                {streaming && selected === index ? " ·" : ""}
              </button>
            ))}
          </div>

          <article className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            {selectedPost?.title || selectedPost?.body ? (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  {selectedPost.title || (streaming ? "…" : "")}
                </h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
                  {selectedPost.body || (streaming ? "Печатаем текст…" : "")}
                </p>
                {selectedPost.cta ? (
                  <p className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]">
                    {selectedPost.cta}
                  </p>
                ) : null}
                {selectedPost.hashtags?.length ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">{selectedPost.hashtags.join(" ")}</p>
                ) : null}
                {selectedPost.title && selectedPost.body && selectedPost.cta && selectedPost.hashtags ? (
                  <button
                    type="button"
                    onClick={() =>
                      void copyText(formatPost(selectedPost as ContentPost), `variant-${selected}`)
                    }
                    className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                  >
                    {copiedId === `variant-${selected}` ? "Скопировано" : "Скопировать пост"}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                После генерации здесь появится заголовок, текст, призыв и хэштеги.
              </p>
            )}
          </article>
        </div>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">История</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Пока пусто — сгенерируйте первый пост.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {history.map((post) => (
                <li key={post.id} className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted)]">
                    {SOCIAL_PLATFORM_LABELS[post.platform]} · {new Date(post.created_at).toLocaleString("ru")}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-[var(--ink)]">{post.title}</p>
                  <button
                    type="button"
                    onClick={() => void copyText(formatPost(post), post.id)}
                    className="mt-2 text-xs text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    {copiedId === post.id ? "Скопировано" : "Скопировать"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
