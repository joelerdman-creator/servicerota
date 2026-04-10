import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips Firestore-specific types from a volunteer object before passing it to
 * a server action or scheduling engine. Converts Timestamp fields to ISO strings
 * and ensures assignmentHistory defaults to [].
 */
export function normalizeVolunteerForScheduling<T extends Record<string, any>>(
  v: T
): T & { assignmentHistory: { roleTemplateId: string; date: string }[] } {
  const out: any = { ...v };
  if (out.createdAt && typeof out.createdAt.toDate === "function") {
    out.createdAt = out.createdAt.toDate().toISOString();
  }
  out.assignmentHistory = Array.isArray(out.assignmentHistory) ? out.assignmentHistory : [];
  return out;
}

export function getServiceColor(serviceId: string) {
  const colors = [
    "bg-stone-100 text-stone-700 hover:bg-stone-100 dark:bg-stone-900/30 dark:text-stone-300",
    "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
    "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300",
    "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300",
    "bg-lime-100 text-lime-700 hover:bg-lime-100 dark:bg-lime-900/30 dark:text-lime-300",
    "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300",
    "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300",
    "bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300",
    "bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300",
    "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300",
    "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300",
    "bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300",
    "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300",
    "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    "bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300",
    "bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-300"
  ];
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = serviceId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
