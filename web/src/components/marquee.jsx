import Marquee from "react-fast-marquee";

export default function NewsMarquee({ newsItems }) {
  const items = Array.isArray(newsItems) ? newsItems : [];

  return (
    <div className="relative py-5 before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-32 before:bg-gradient-to-r before:from-[#000000] before:to-transparent after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-32 after:bg-gradient-to-l after:from-[#000000] after:to-transparent overflow-hidden rounded-3xl bg-white/[0.01] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none"></div>
      <Marquee speed={150} gradient={false} pauseOnHover>
        {items.map((item, index) => (
          <div
            key={`${index}-${item.slice(0, 24)}`}
            className="mx-4 flex items-center justify-center"
          >
            <p className="rounded-full border border-white/[0.05] bg-black/40 px-6 py-2.5 text-sm font-light tracking-wide text-zinc-300 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.15] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] sm:text-base cursor-default select-none">
              {item}
            </p>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
