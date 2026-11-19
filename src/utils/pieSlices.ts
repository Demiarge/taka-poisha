import type { Transaction, TransactionType } from '@/types/transaction';

/** A calendar month ("YYYY-MM") or everything. */
export type Period = { kind: 'month'; month: string } | { kind: 'all' };

export type Slice = {
  /** The category name, or OTHER_KEY for the grouped rest. */
  key: string;
  label: string;
  /** Categories this slice covers: one, or several for "Other". */
  categories: string[];
  total: number;
  /** 0-1 share of the period total. */
  fraction: number;
  /** Radians, clockwise from 12 o'clock. */
  startAngle: number;
  endAngle: number;
};

export type PieData = { total: number; slices: Slice[] };

export const OTHER_KEY = '__other__';
/** More categories than this and the smallest are grouped as "Other". */
const MAX_SLICES = 8;
const KEPT_WHEN_GROUPED = 7;

export function inPeriod(transaction: Transaction, period: Period): boolean {
  return period.kind === 'all' || transaction.date.startsWith(period.month);
}

/** One slice per category, biggest first; past 8 categories, the top 7 plus "Other". */
export function buildPie(transactions: Transaction[], type: TransactionType, period: Period): PieData {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === type && inPeriod(transaction, period)) {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    }
  }

  const sorted = [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) {
    return { total: 0, slices: [] };
  }

  const groups: { key: string; label: string; categories: string[]; total: number }[] = [];
  const kept = sorted.length > MAX_SLICES ? sorted.slice(0, KEPT_WHEN_GROUPED) : sorted;
  for (const [name, amount] of kept) {
    groups.push({ key: name, label: name, categories: [name], total: amount });
  }
  const rest = sorted.slice(kept.length);
  if (rest.length > 0) {
    groups.push({
      key: OTHER_KEY,
      label: 'Other',
      categories: rest.map(([name]) => name),
      total: rest.reduce((sum, [, amount]) => sum + amount, 0),
    });
  }

  let angle = 0;
  const slices = groups.map((group) => {
    const fraction = group.total / total;
    const startAngle = angle;
    angle += fraction * 2 * Math.PI;
    return { ...group, fraction, startAngle, endAngle: angle };
  });
  return { total, slices };
}

/** "37%", or "<1%" for a sliver that would round to 0. */
export function formatShare(fraction: number): string {
  if (fraction > 0 && fraction < 0.005) {
    return '<1%';
  }
  return `${Math.round(fraction * 100)}%`;
}

/** The slice under a tap, by angle from the centre; null in the hole or outside the ring. */
export function sliceAt(
  slices: Slice[],
  x: number,
  y: number,
  centre: number,
  innerRadius: number,
  outerRadius: number,
): Slice | null {
  const dx = x - centre;
  const dy = y - centre;
  const distance = Math.hypot(dx, dy);
  if (distance < innerRadius || distance > outerRadius) {
    return null;
  }
  // atan2(dx, -dy) is 0 at 12 o'clock and grows clockwise.
  let angle = Math.atan2(dx, -dy);
  if (angle < 0) {
    angle += 2 * Math.PI;
  }
  return slices.find((slice) => angle >= slice.startAngle && angle < slice.endAngle) ?? slices.at(-1) ?? null;
}

/** SVG path for one ring segment. A full ring needs two arcs, because one arc can't start and end at the same point. */
export function ringSegmentPath(
  centre: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const point = (radius: number, angle: number) =>
    `${(centre + radius * Math.sin(angle)).toFixed(3)} ${(centre - radius * Math.cos(angle)).toFixed(3)}`;

  if (endAngle - startAngle >= 2 * Math.PI - 1e-6) {
    const half = startAngle + Math.PI;
    return [
      `M ${point(outerRadius, startAngle)}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${point(outerRadius, half)}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${point(outerRadius, startAngle)}`,
      `M ${point(innerRadius, startAngle)}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${point(innerRadius, half)}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${point(innerRadius, startAngle)}`,
      'Z',
    ].join(' ');
  }

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${point(outerRadius, startAngle)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${point(outerRadius, endAngle)}`,
    `L ${point(innerRadius, endAngle)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${point(innerRadius, startAngle)}`,
    'Z',
  ].join(' ');
}

/** "YYYY-MM" plus or minus some months. */
export function shiftMonth(month: string, by: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
