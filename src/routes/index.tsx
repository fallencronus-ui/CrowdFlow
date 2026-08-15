import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity, Brain, Eye, Repeat, ShieldCheck, Wrench } from "lucide-react";
import { useDemo } from "@/state/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrowdFlow Intelligence — Predict. Explain. Intervene." },
      {
        name: "description",
        content:
          "A crowd-management command center for large public venues: predict bottlenecks before they form, explain why, recommend an intervention and verify the outcome in a digital twin.",
      },
      { property: "og:title", content: "CrowdFlow Intelligence" },
      {
        property: "og:description",
        content:
          "Observe, predict, explain, act, verify, learn — predictive crowd intelligence for large venues.",
      },
    ],
  }),
  component: LandingPage,
});

const BOOT_LINES = [
  "INITIALISING CROWDFLOW CORE",
  "LOADING VENUE CONFIGURATION",
  "MOUNTING DIGITAL TWIN SURFACE",
  "CALIBRATING DENSITY THRESHOLDS",
  "ARMING PREDICTIVE ENGINE",
  "COMMAND CENTER READY",
];

const LOOP = [
  { icon: Eye, label: "OBSERVE", text: "Zone occupancy, density and flow are read every cycle." },
  { icon: Brain, label: "PREDICT", text: "Forward projection flags a bottleneck before it forms." },
  { icon: Activity, label: "EXPLAIN", text: "Ranked risk drivers show exactly why a zone is at risk." },
  { icon: ArrowRight, label: "ACT", text: "A concrete intervention is recommended to the operator." },
  { icon: ShieldCheck, label: "VERIFY", text: "The twin compares projected density with and without it." },
  { icon: Repeat, label: "LEARN", text: "Recurring hotspots become infrastructure recommendations." },
];

function LandingPage() {
  const [step, setStep] = useState(0);
  const booted = step >= BOOT_LINES.length;
  const { dataSource, setDataSource, connection } = useDemo();

  useEffect(() => {
    if (booted) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 260 : 200);
    return () => window.clearTimeout(id);
  }, [step, booted]);

  if (!booted) return <BootScreen step={step} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-mono text-sm font-bold tracking-[0.18em]">
                CROWDFLOW INTELLIGENCE
              </p>
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
                PREDICT. EXPLAIN. INTERVENE.
              </p>
            </div>
          </div>
          <div
            className="inline-flex border border-border bg-panel-raised"
            role="group"
            aria-label="Data source"
          >
            {(["DEMO", "BACKEND"] as const).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setDataSource(source)}
                aria-pressed={dataSource === source}
                className={cn(
                  "px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] transition-colors",
                  dataSource === source
                    ? "bg-info/15 text-info"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {source}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-14 max-w-3xl">
          <p className="font-mono text-[11px] tracking-[0.28em] text-info">
            CROWD-MANAGEMENT COMMAND CENTER
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            See the bottleneck
            <span className="text-critical"> before</span> it forms.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            CrowdFlow turns raw crowd observations from a venue into an operational decision:
            where congestion will occur, when, why it is building, what to do about it, and what
            the expected result is — verified in a digital twin before anyone is moved.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/command-center"
              className="inline-flex items-center gap-2 border border-info bg-info/15 px-6 py-3 font-mono text-xs font-bold tracking-[0.2em] text-info transition-colors hover:bg-info/25"
            >
              ENTER COMMAND CENTER
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/digital-twin"
              className="inline-flex items-center gap-2 border border-border-strong px-6 py-3 font-mono text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              OPEN DIGITAL TWIN
            </Link>
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              SOURCE — {dataSource === "BACKEND" ? connection : "DETERMINISTIC DEMO SCENARIO"}
            </span>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="tech-label mb-4 text-foreground/80">How it works</h2>
          <ol className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((item, i) => (
              <li key={item.label} className="bg-panel px-4 py-4">
                <div className="flex items-center gap-2">
                  <item.icon className="size-4 text-info" aria-hidden />
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em]">
                    {String(i + 1).padStart(2, "0")} {item.label}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          <Note
            icon={Eye}
            title="Two data sources"
            text="Run the deterministic demo scenario, or connect the analysis pipeline for live values. Missing backend values are shown as N/A — never invented."
          />
          <Note
            icon={ShieldCheck}
            title="Explainable by design"
            text="Every risk score decomposes into the signals behind it: capacity utilisation, density growth, net inflow, forecast breach and recurrence."
          />
          <Note
            icon={Wrench}
            title="From incident to infrastructure"
            text="Recurring hotspots are ranked and converted into venue improvement hypotheses you can investigate after the event."
          />
        </section>

        <footer className="mt-auto pt-12 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          CROWDFLOW INTELLIGENCE — OPERATIONAL CROWD SAFETY
        </footer>
      </div>
    </div>
  );
}

function Note({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Eye;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-border bg-panel px-4 py-4">
      <Icon className="size-4 text-info" aria-hidden />
      <p className="mt-2 font-mono text-[12px] font-semibold tracking-wide">{title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function BootScreen({ step }: { step: number }) {
  const progress = Math.round((step / BOOT_LINES.length) * 100);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <BrandMark />
          <p className="font-mono text-sm font-bold tracking-[0.18em]">
            CROWDFLOW INTELLIGENCE
          </p>
        </div>
        <div className="mt-6 h-1 w-full bg-secondary">
          <div
            className="h-full bg-info transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="mt-4 space-y-1" aria-live="polite">
          {BOOT_LINES.slice(0, step).map((line) => (
            <li
              key={line}
              className="flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-muted-foreground"
            >
              <span>{line}</span>
              <span className="text-safe">OK</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 26 26" aria-hidden className="shrink-0">
      <rect x="0.75" y="0.75" width="24.5" height="24.5" stroke="var(--info)" fill="none" />
      <circle cx="13" cy="13" r="7.5" stroke="var(--info)" strokeOpacity="0.5" fill="none" />
      <circle cx="13" cy="13" r="3" fill="var(--critical)" />
      <path d="M2 13h4M20 13h4M13 2v4M13 20v4" stroke="var(--info)" strokeOpacity="0.8" />
    </svg>
  );
}
