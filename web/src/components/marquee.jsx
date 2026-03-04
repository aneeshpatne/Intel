import Marquee from "react-fast-marquee";

export function NewsMarquee({ newsItems }) {
  console.log(newsItems);
  return (
    <div className="rounded-full border border-zinc-800/70 p-2">
      <Marquee>
        {newsItems.map((item) => (
          <h1>{item}</h1>
        ))}
      </Marquee>
    </div>
  );
}
