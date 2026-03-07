import type { DebtItem } from "@/types/project";

export interface AmortizationRow {
  month: number;
  capitalRepaid: number;
  interest: number;
  insurance: number;
  totalPayment: number;
  remainingBalance: number;
  isDeferral: boolean;
}

export interface AmortizationSummary {
  totalInterest: number;
  totalInsurance: number;
  totalCost: number;
  deferralPayment: number;
  amortPayment: number;
  deferralCapital: number;
  deferralInterest: number;
  deferralInsurance: number;
  amortCapital: number;
  amortAvgInterest: number;
  amortInsurance: number;
  capitalAfterDeferral: number;
  amortMonths: number;
  deferralMonths: number;
}

/**
 * Compute a full month-by-month amortization schedule for a bank loan.
 * Linear amortization, degressive interest, supports partial & total deferral.
 */
export function computeAmortizationSchedule(debt: DebtItem): AmortizationRow[] {
  if (debt.type !== "BANK_LOAN" || debt.amount <= 0 || debt.durationMonths <= 0) return [];

  const rows: AmortizationRow[] = [];
  const monthlyRate = (debt.annualRate / 100) / 12;
  const deferralMonths = debt.deferralType !== "NONE" ? debt.deferralMonths : 0;
  const amortMonths = Math.max(debt.durationMonths - deferralMonths, 0);

  let balance = debt.amount;

  // Deferral period
  for (let m = 1; m <= deferralMonths; m++) {
    const interest = balance * monthlyRate;
    const capitalRepaid = 0;
    const insurance = debt.insuranceMonthly;

    if (debt.deferralType === "TOTAL") {
      // Interest capitalized
      balance += interest;
      rows.push({
        month: m,
        capitalRepaid: 0,
        interest,
        insurance,
        totalPayment: insurance, // only insurance paid
        remainingBalance: balance,
        isDeferral: true,
      });
    } else {
      // PARTIAL: interest paid
      rows.push({
        month: m,
        capitalRepaid: 0,
        interest,
        insurance,
        totalPayment: interest + insurance,
        remainingBalance: balance,
        isDeferral: true,
      });
    }
  }

  // Amortization period
  if (amortMonths > 0) {
    const monthlyCapital = balance / amortMonths;
    for (let m = 1; m <= amortMonths; m++) {
      const interest = balance * monthlyRate;
      const insurance = debt.insuranceMonthly;
      const total = monthlyCapital + interest + insurance;
      balance -= monthlyCapital;
      if (balance < 0.01) balance = 0;

      rows.push({
        month: deferralMonths + m,
        capitalRepaid: monthlyCapital,
        interest,
        insurance,
        totalPayment: total,
        remainingBalance: balance,
        isDeferral: false,
      });
    }
  }

  return rows;
}

/**
 * Get summary stats from debt parameters (without generating full schedule).
 */
export function computeAmortizationSummary(debt: DebtItem): AmortizationSummary | null {
  if (debt.type !== "BANK_LOAN" || debt.amount <= 0 || debt.durationMonths <= 0) return null;

  const monthlyRate = (debt.annualRate / 100) / 12;
  const deferralMonths = debt.deferralType !== "NONE" ? debt.deferralMonths : 0;
  const amortMonths = Math.max(debt.durationMonths - deferralMonths, 0);

  const capitalAfterDeferral = debt.deferralType === "TOTAL"
    ? debt.amount * Math.pow(1 + monthlyRate, deferralMonths)
    : debt.amount;

  const monthlyCapital = amortMonths > 0 ? capitalAfterDeferral / amortMonths : 0;
  const interestFirst = capitalAfterDeferral * monthlyRate;
  const interestLast = monthlyCapital * monthlyRate;
  const avgInterest = (interestFirst + interestLast) / 2;

  const deferralInterest = debt.amount * monthlyRate;
  const deferralPayment = (debt.deferralType === "PARTIAL" ? deferralInterest : 0) + debt.insuranceMonthly;
  const amortPayment = monthlyCapital + avgInterest + debt.insuranceMonthly;

  const totalInterest = (deferralMonths * deferralInterest) + (amortMonths * avgInterest);
  const totalInsurance = debt.durationMonths * debt.insuranceMonthly;
  const totalCost = (deferralMonths * deferralPayment) + (amortMonths * amortPayment);

  return {
    totalInterest,
    totalInsurance,
    totalCost,
    deferralPayment,
    amortPayment,
    deferralCapital: 0,
    deferralInterest,
    deferralInsurance: debt.insuranceMonthly,
    amortCapital: monthlyCapital,
    amortAvgInterest: avgInterest,
    amortInsurance: debt.insuranceMonthly,
    capitalAfterDeferral,
    amortMonths,
    deferralMonths,
  };
}

/**
 * Estimate current remaining balance given elapsed months (linear approximation).
 */
export function estimateRemainingBalance(debt: DebtItem, elapsedMonths: number): number {
  if (debt.type !== "BANK_LOAN" || debt.amount <= 0) return debt.amount;

  const monthlyRate = (debt.annualRate / 100) / 12;
  const deferralMonths = debt.deferralType !== "NONE" ? debt.deferralMonths : 0;
  const amortMonths = Math.max(debt.durationMonths - deferralMonths, 0);

  if (elapsedMonths <= deferralMonths) {
    // Still in deferral
    if (debt.deferralType === "TOTAL") {
      return debt.amount * Math.pow(1 + monthlyRate, elapsedMonths);
    }
    return debt.amount;
  }

  const capitalAfterDeferral = debt.deferralType === "TOTAL"
    ? debt.amount * Math.pow(1 + monthlyRate, deferralMonths)
    : debt.amount;

  const amortElapsed = Math.min(elapsedMonths - deferralMonths, amortMonths);
  const monthlyCapital = amortMonths > 0 ? capitalAfterDeferral / amortMonths : 0;
  return Math.max(0, capitalAfterDeferral - monthlyCapital * amortElapsed);
}

/**
 * Compute the next monthly payment based on elapsed months.
 */
export function computeNextPayment(debt: DebtItem, elapsedMonths: number): number {
  if (debt.type === "LEASE") return debt.monthlyPayment;
  if (debt.type !== "BANK_LOAN" || debt.amount <= 0) return 0;

  const monthlyRate = (debt.annualRate / 100) / 12;
  const deferralMonths = debt.deferralType !== "NONE" ? debt.deferralMonths : 0;

  if (elapsedMonths < deferralMonths) {
    const interest = debt.amount * monthlyRate;
    return (debt.deferralType === "PARTIAL" ? interest : 0) + debt.insuranceMonthly;
  }

  const summary = computeAmortizationSummary(debt);
  return summary?.amortPayment ?? 0;
}
