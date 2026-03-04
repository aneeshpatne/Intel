import Marquee from "react-fast-marquee";

export function NewsMarquee({ newsItems }) {
  const items = Array.isArray(newsItems) ? newsItems : [];

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800/55 bg-zinc-950/15 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <Marquee speed={75} gradient={false}>
        {items.map((item, index) => (
          <div key={`${index}-${item.slice(0, 24)}`} className="mx-2">
            <p className="rounded-2xl border border-zinc-700/70 bg-gradient-to-b from-zinc-900/85 to-zinc-950/90 px-4 py-2 text-sm font-medium tracking-[0.01em] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors duration-300 hover:border-zinc-500/70 hover:text-white sm:text-base">
              {item}
            </p>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
