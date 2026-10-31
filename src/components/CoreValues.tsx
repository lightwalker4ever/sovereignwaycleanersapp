import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CORE_VALUES } from "@/lib/brand-content";

export default function CoreValues() {
  return (
    <section id="values" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            What We Stand For
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Our Core Values
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            These principles guide every job we take on and every relationship we build.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <Card
                key={value.title}
                className="rounded-2xl bg-gray-50 shadow-sm transition-shadow hover:shadow-md gap-2"
              >
                <CardHeader className="pb-0">
                  <div
                    className="mb-3 inline-flex w-fit items-center justify-center rounded-full p-3"
                    style={{ backgroundColor: "var(--color-brand-light)" }}
                  >
                    <Icon size={24} style={{ color: "var(--color-brand)" }} />
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {value.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-gray-600">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
