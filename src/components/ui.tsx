import { cn, statusColor, statusLabel, getMatchLevelColor, getMatchLevelLabel, formatRelative, reputationLabel } from "@/lib/utils";
import { ArrowLeft, PackageSearch, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("badge", className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={statusColor(status)}>{statusLabel(status)}</Badge>
  );
}

export function MatchBadge({ level, score }: { level: string; score?: number }) {
  return (
    <Badge className={getMatchLevelColor(level)}>
      {getMatchLevelLabel(level)}
      {score != null ? ` · ${Math.round(score)}%` : ""}
    </Badge>
  );
}

export function ReputationBadge({ level }: { level: string }) {
  return (
    <Badge className="border-violet-200 bg-violet-50 text-violet-700">
      {reputationLabel(level)}
    </Badge>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <PackageSearch className="h-8 w-8 text-slate-400" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back ? (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-retruv-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-retruv-sky">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-retruv-navy sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-retruv-navy">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50">
            <Icon className="h-5 w-5 text-retruv-blue" strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TimeAgo({ date }: { date: string | Date }) {
  return <span>{formatRelative(date)}</span>;
}

export function Alert({
  type = "info",
  children,
}: {
  type?: "info" | "success" | "warning" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  };
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", styles[type])}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-retruv-blue to-retruv-teal"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
