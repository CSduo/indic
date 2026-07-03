import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  label: string;
  href?: string;
};

type SubmissionStepperProps = {
  active: number;
  steps?: Step[];
  className?: string;
};

const DEFAULT_STEPS: Step[] = [
  { label: "Details" },
  { label: "Upload" },
  { label: "Review" },
];

export function SubmissionStepper({ active, steps = DEFAULT_STEPS, className }: SubmissionStepperProps) {
  return (
    <div className={cn("step-line", className)} aria-label="Submission progress">
      {steps.map((step, index) => {
        const done = index < active;
        const isActive = index === active;
        return (
          <div className="contents" key={step.label}>
            <div className={cn("step-dot", done && "done", isActive && "active")} aria-current={isActive ? "step" : undefined}>
              {done ? <Check size={14} /> : index + 1}
            </div>
            <div className="mx-2 hidden min-w-0 sm:block">
              <div className="font-ui text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: isActive ? "var(--terracotta)" : "var(--ink-faint)" }}>
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 ? <div className="step-connector mx-2" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}
