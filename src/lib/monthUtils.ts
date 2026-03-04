/**
 * Convert a monthIndex to a human-readable calendar date.
 * The model stays index-based — this is purely a display layer.
 */
export function formatMonthIndex(monthIndex: number, projectStartDate?: string): string {
  if (!projectStartDate) return `Mois ${monthIndex}`;
  const parts = projectStartDate.split("-");
  if (parts.length < 2) return `Mois ${monthIndex}`;
  const [year, month] = parts.map(Number);
  const date = new Date(year, month - 1 + monthIndex);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/**
 * Format the end date of a duration starting at startMonth.
 * Example: startMonth=3, duration=24 → month 26 label
 */
export function formatMonthRange(startMonth: number, durationMonths: number, projectStartDate: string): string {
  return formatMonthIndex(startMonth + durationMonths - 1, projectStartDate);
}

/**
 * Short label: "mois X (Mois Année)"
 */
export function monthLabel(monthIndex: number, projectStartDate: string): string {
  return `mois ${monthIndex} (${formatMonthIndex(monthIndex, projectStartDate)})`;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export { MONTH_NAMES };
