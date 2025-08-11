import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

export function parseCurrency(value: string): number {
  if (value == null) return 0;
  const normalized = String(value).replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) return 0;
  return Math.round(amount * 100);
}
