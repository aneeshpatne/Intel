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
    <section className="mx-auto w-full max-w-[80rem]">
      <div className="mb-6 flex items-end justify-between border-b border-white/[0.08] pb-4">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold mb-1">
            Live Intel
          </p>
          <h2 className="text-4xl lg:text-5xl font-normal tracking-wide text-zinc-100 intel-title-font">
            Breaking News
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-400"></span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 mt-0.5">
            {items.length} Reports
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="group relative overflow-hidden rounded-3xl bg-black/40 border border-white/[0.05] p-6 sm:p-8 transition-all duration-500 hover:bg-white/[0.02] hover:border-white/[0.1] shadow-lg backdrop-blur-xl flex flex-col gap-6"
            >


              <h3 className="text-3xl sm:text-4xl font-normal leading-tight text-zinc-100 tracking-wide intel-title-font">
                {title}
              </h3>

              {item.ogUrl ? (
                <div className="w-full shrink-0">
                  <div className="relative w-full aspect-video overflow-hidden rounded-2xl border border-white/[0.05] bg-black/20">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10 pointer-events-none"></div>
                    <img
                      src={item.ogUrl}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex-1 flex flex-col">
                <p className="text-[15px] sm:text-base font-light leading-relaxed text-zinc-300 tracking-wide">
                  {content}
                </p>

                {sourceCount > 0 ? (
                  <div className="mt-auto pt-5 border-t border-white/[0.05]">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Verified Sources
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
                            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
                            title={src}
                          >
                            {faviconUrl ? (
                              <img
                                src={faviconUrl}
                                alt=""
                                className="h-3.5 w-3.5 rounded-sm"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <span className="max-w-[12rem] truncate font-medium tracking-wide">
                              {label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
