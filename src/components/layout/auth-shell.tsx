import { ArrowUpRight, Check, CircleDot, Workflow } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const steps = ["Collect", "Understand", "Respond"];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(420px,0.94fr)_1.06fr]">
      <section className="relative flex min-h-[600px] flex-col overflow-hidden bg-[#102a32] px-7 py-7 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-16">
        <div className="absolute -right-44 top-36 size-[430px] rounded-full border border-white/[0.06]" />
        <div className="absolute -right-24 top-56 size-[270px] rounded-full border border-white/[0.08]" />
        <div className="absolute -bottom-40 -left-32 size-[410px] rounded-full bg-teal-400/[0.07] blur-3xl" />

        <div className="relative z-10">
          <BrandMark light />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-20 lg:py-0">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-teal-100">
            <CircleDot className="size-3.5 text-teal-300" />
            Operational clarity, in real time
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
            Know what’s moving through your systems.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-300">
            Bring activity from every service into one calm, reliable view. Find
            the signal, follow the details, and act with confidence.
          </p>

          <div className="mt-12 max-w-md rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/10 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">A clearer path from event to action</p>
                <p className="mt-1 text-xs text-slate-400">A workspace designed for operational teams</p>
              </div>
              <Workflow aria-hidden="true" className="size-5 shrink-0 text-teal-300" />
            </div>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              {steps.map((step, index) => (
                <div className="contents" key={step}>
                  <div className="flex min-w-0 flex-col items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-teal-200">
                      {index === steps.length - 1 ? (
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      ) : (
                        <Check aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="text-[11px] text-slate-300">{step}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <span aria-hidden="true" className="h-px w-6 bg-white/15 sm:w-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          Built for teams that care about the details.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            {title}
          </h2>
          <p className="mt-2 mb-8 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}
