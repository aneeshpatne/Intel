import Marquee from "react-fast-marquee";

export default function NewsMarquee({ newsItems }) {
  const items = Array.isArray(newsItems) ? newsItems : [];

  return (
    <div className="border border-zinc-700/70 bg-[#0a0d12] py-3">
      <Marquee speed={68} gradient={false} pauseOnHover>
        {items.map((item, index) => (
          <div key={`${index}-${item.slice(0, 24)}`} className="mx-2">
            <p className="border border-zinc-700/80 bg-[#0d1117] px-4 py-2 text-sm font-medium tracking-[0.01em] text-zinc-100 transition-colors duration-300 hover:border-zinc-500/80 sm:text-base">
              {item}
            </p>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
