export default function Vision() {
  return (
    <section id="vision" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-4xl px-6 py-20 lg:px-8 text-center">
        <p
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-brand)" }}
        >
          Our Vision
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Where We&apos;re Headed
        </h2>

        <div className="mt-10 relative">
          <svg
            className="mx-auto mb-6 h-10 w-10 opacity-20"
            style={{ color: "var(--color-brand)" }}
            fill="currentColor"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
          </svg>
          <p className="text-xl leading-9 text-gray-700 sm:text-2xl sm:leading-10">
            To become a trusted leader in delivering high-quality, professional cleaning
            services across the UK — while creating meaningful impact by offering training
            and internship opportunities in the cleaning industry, empowering others with
            skills, and actively giving back through community engagement and local
            initiatives.
          </p>
        </div>
      </div>
    </section>
  );
}
