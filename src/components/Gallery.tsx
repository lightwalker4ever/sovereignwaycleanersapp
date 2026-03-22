import Image from "next/image";

const images = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Gallery() {
  return (
    <section id="gallery" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-600 uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Our Work
          </p>
          <h2 className="mt-2 text-3xl font-800 tracking-tight text-gray-900 sm:text-4xl">
            Before &amp; After Gallery
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            See the difference our team makes across a range of properties.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((n) => (
            <div
              key={n}
              className="group relative aspect-square overflow-hidden rounded-xl shadow-sm"
            >
              <Image
                src={`/gallery/Gallery Photo ${n}.webp`}
                alt={`Gallery photo ${n}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
