import { useMemo } from "react";
import { parse } from "tldts";

function normalizeNews(value) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const typed = item && typeof item === "object" ? item : {};
    const article =
      typed.article && typeof typed.article === "object"
        ? typed.article
        : undefined;

    return {
      article,
      source: Array.isArray(typed.source) ? typed.source : [],
      ogUrl: typeof typed.ogUrl === "string" ? typed.ogUrl : null,
    };
  });
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "";
  }
}

function getDomainMeta(rawUrl) {
  const hostname = getHostname(rawUrl);
  if (!hostname) return { domain: "", label: "source", faviconUrl: "" };

  const parsed = parse(rawUrl);
  const domain = parsed.domain || hostname;
  const label = parsed.domainWithoutSuffix || domain;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return { domain, label, faviconUrl };
}

export default function BreakingNewsFeed({ newsData }) {
  const items = useMemo(() => normalizeNews(newsData), [newsData]);

  return (
    <section className="mx-auto mt-8 w-full max-w-[80rem] border border-zinc-800/80 bg-[#090c12] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800/90 pb-4">
        <h2 className="text-lg font-semibold uppercase tracking-[0.14em] text-zinc-200">
          Breaking News
        </h2>
        <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
          {items.length} items
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => {
          const title = item.article?.title || "Untitled";
          const content = item.article?.newsContent || "No content available";
          const rawSources = item.source || [];
          const seenDomains = new Set();
          const uniqueSources = rawSources.filter((src) => {
            const { domain } = getDomainMeta(src);
            const key = domain || src;
            if (seenDomains.has(key)) return false;
            seenDomains.add(key);
            return true;
          });
          const sourceCount = uniqueSources.length;

          return (
            <article
              key={`${index}-${title.slice(0, 32)}`}
              className="border border-zinc-800/80 bg-[#0b0f16] p-4"
            >
              {item.ogUrl ? (
                <img
                  src={item.ogUrl}
                  alt={title}
                  loading="lazy"
                  className="mb-3 h-40 w-full border border-zinc-800/80 object-cover"
                />
              ) : null}
              <h3 className="intel-title-font text-5xl font-normal leading-tight text-zinc-100">
                {title}
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {content}
              </p>

              {sourceCount > 0 ? (
                <div className="mt-4 border-t border-zinc-800/80 pt-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSources.map((src, sourceIndex) => {
                      const { label, faviconUrl } = getDomainMeta(src);

                      return (
                        <a
                          key={`${index}-${sourceIndex}-${label}`}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 border border-zinc-700/80 bg-[#0d1117] px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500/80 hover:text-zinc-100"
                          title={src}
                        >
                          {faviconUrl ? (
                            <img
                              src={faviconUrl}
                              alt=""
                              className="h-3.5 w-3.5"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <span className="max-w-[10rem] truncate">
                            {label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
                <span>
                  {sourceCount} source{sourceCount === 1 ? "" : "s"}
                </span>
                <span
                  className={item.ogUrl ? "text-zinc-500" : "text-zinc-600"}
                >
                  {item.ogUrl ? "image loaded" : "no image"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
