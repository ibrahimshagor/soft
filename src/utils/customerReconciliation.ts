import { Customer, LoanRecord, PaymentRecord, Sale } from '../types';

/**
 * Returns ONLY the amount paid upfront on a sale (at the time of creating/editing the invoice),
 * excluding subsequent collections recorded in `paymentRecords` so collections are never double-counted.
 */
export function getSaleUpfrontPaid(sale: Sale, customerPaymentRecords: PaymentRecord[]): number {
  const paid = Math.max(0, Number(sale.paidAmount) || 0);

  // Explicit tracking on new/updated sales
  if (sale.initialPaidAmount !== undefined) {
    return Math.max(0, Number(sale.initialPaidAmount) || 0);
  }
  if (sale.allocatedFromPayments !== undefined) {
    return Math.max(0, paid - (Number(sale.allocatedFromPayments) || 0));
  }

  // Legacy sales: subtract any legacy PaymentRecord that explicitly targeted this invoice
  if (paid <= 0) return 0;

  const explicitlyAllocated = customerPaymentRecords
    .filter(
      (pr) =>
        pr.type === 'customer_collection' &&
        !pr.allocations &&
        pr.refInvoiceOrPurchaseNo &&
        pr.refInvoiceOrPurchaseNo === sale.invoiceNo
    )
    .reduce((sum, pr) => sum + (Number(pr.amount) || 0), 0);

  return Math.max(0, paid - explicitlyAllocated);
}

/**
 * Deterministically computes a customer's reconciled totalPurchased, totalPaid, and currentDue
 * from Opening Balance + Sales + Payment Collections + Customer Loans.
 * Handles both modern tracked records and legacy Firestore records without double-counting.
 */
export function computeCustomerReconciledTotals(
  customer: Customer,
  allSales: Sale[],
  allPaymentRecords: PaymentRecord[],
  allLoanRecords: LoanRecord[]
): {
  totalPurchased: number;
  totalPaid: number;
  currentDue: number;
  remainingOpeningDue: number;
} {
  const custSales = allSales.filter((s) => s.customerId === customer.id);
  const custPayments = allPaymentRecords.filter(
    (pr) => pr.type === 'customer_collection' && pr.partyId === customer.id
  );
  const custLoans = allLoanRecords.filter(
    (lr) =>
      lr.customerId === customer.id ||
      (lr.partyType === 'customer' && lr.partyId === customer.id)
  );

  const opening = Math.max(0, Number(customer.openingBalance) || 0);
  const totalPurchased = custSales.reduce(
    (sum, s) => sum + Math.max(0, Number(s.grandTotal) || 0),
    0
  );
  const totalPaymentsCollected = custPayments.reduce(
    (sum, pr) => sum + Math.max(0, Number(pr.amount) || 0),
    0
  );

  let upfrontPaidOnSales = custSales.reduce(
    (sum, s) => sum + getSaleUpfrontPaid(s, custPayments),
    0
  );

  // Legacy double-count guard:
  // If old code mutated legacy `sale.paidAmount` via general FIFO payment (no `allocations` and no `refInvoiceOrPurchaseNo`),
  // avoid double-subtracting both `sale.paidAmount` and `paymentRecords.amount` when `customer.currentDue` already matched `opening + sum(sale.dueAmount)`.
  const legacySalesWithPaid = custSales.filter(
    (s) =>
      s.initialPaidAmount === undefined &&
      s.allocatedFromPayments === undefined &&
      (Number(s.paidAmount) || 0) > 0
  );
  const legacyGeneralPaymentsSum = custPayments
    .filter((pr) => !pr.allocations && !pr.refInvoiceOrPurchaseNo)
    .reduce((sum, pr) => sum + Math.max(0, Number(pr.amount) || 0), 0);

  if (legacySalesWithPaid.length > 0 && legacyGeneralPaymentsSum > 0) {
    const legacySalesDueSum = custSales.reduce(
      (sum, s) => sum + Math.max(0, Number(s.dueAmount) || 0),
      0
    );
    const legacyPaidPool = legacySalesWithPaid.reduce(
      (sum, s) => sum + getSaleUpfrontPaid(s, custPayments),
      0
    );
    const maxPossibleOverlap = Math.min(legacyPaidPool, legacyGeneralPaymentsSum);
    const netWithoutOverlap = Math.max(
      0,
      opening + legacySalesDueSum - Math.max(0, legacyGeneralPaymentsSum - maxPossibleOverlap)
    );
    const netAssumingNoOverlap = Math.max(
      0,
      opening + totalPurchased - upfrontPaidOnSales - totalPaymentsCollected
    );

    // Only apply overlap deduction if stored `currentDue` matches the FIFO-adjusted invoice state
    // and clearly diverges from the unoverlapped ledger state.
    const storedDue = Number(customer.currentDue) || 0;
    if (
      maxPossibleOverlap > 0 &&
      Math.abs(storedDue - netWithoutOverlap) < 1 &&
      Math.abs(storedDue - netAssumingNoOverlap) >= 1
    ) {
      upfrontPaidOnSales = Math.max(0, upfrontPaidOnSales - maxPossibleOverlap);
    }
  }

  const loansLent = custLoans
    .filter((lr) => lr.type === 'lend')
    .reduce((sum, lr) => sum + Math.max(0, Number(lr.amount) || 0), 0);
  const loansCollected = custLoans
    .filter((lr) => lr.type === 'collect_lend')
    .reduce((sum, lr) => sum + Math.max(0, Number(lr.amount) || 0), 0);

  const totalPaid = upfrontPaidOnSales + totalPaymentsCollected;
  const currentDue = Math.max(
    0,
    opening + totalPurchased + loansLent - totalPaid - loansCollected
  );

  const totalInvoiceDues = custSales.reduce(
    (sum, s) => sum + Math.max(0, Number(s.dueAmount) || 0),
    0
  );
  const remainingOpeningDue = Math.max(0, currentDue - totalInvoiceDues);

  return {
    totalPurchased,
    totalPaid,
    currentDue,
    remainingOpeningDue,
  };
}

export interface InvoicePreviousDueItem {
  id: string;
  date: string;
  label: string;
  amount: number;
}

export interface InvoiceAppliedPaymentLine {
  id: string;
  date: string;
  label: string;
  amount: number;
}

export interface InvoicePreviousDueBreakdown {
  totalPreviousDueFromSales: number;
  customerTotalDueInDirectory: number;
  totalCustomerDueCombined: number;
  totalPreviousDueCombined: number;
  openingBalanceDue: number;
  originalOpeningBalance: number;
  openingBalancePaid: number;
  previousDueItems: InvoicePreviousDueItem[];
  appliedPaymentLines: InvoiceAppliedPaymentLine[];
  previousDuesSummaryList: Array<{
    invoiceNo: string;
    date: string;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
  }>;
}

export function computeInvoicePreviousDueBreakdown(
  sale: Sale,
  customerObj: Customer | undefined,
  previousSalesWithDue: Sale[],
  allSales: Sale[],
  allPaymentRecords: PaymentRecord[],
  allLoanRecords: LoanRecord[]
): InvoicePreviousDueBreakdown {
  const totalPreviousDueFromSales = previousSalesWithDue.reduce(
    (sum, s) => sum + (s.dueAmount || 0),
    0
  );

  const customerTotalDueInDirectory = customerObj
    ? computeCustomerReconciledTotals(customerObj, allSales, allPaymentRecords, allLoanRecords).currentDue
    : 0;
  const currentMemoDue = sale.dueAmount || 0;

  const totalCustomerDueCombined = Math.max(
    customerTotalDueInDirectory,
    currentMemoDue + totalPreviousDueFromSales
  );

  const totalPreviousDueCombined = Math.max(0, totalCustomerDueCombined - currentMemoDue);
  const openingBalanceDue = Math.max(0, totalPreviousDueCombined - totalPreviousDueFromSales);
  const originalOpeningBalance =
    openingBalanceDue > 0 ? Math.max(customerObj?.openingBalance || 0, openingBalanceDue) : 0;
  const openingBalancePaid = Math.max(0, originalOpeningBalance - openingBalanceDue);

  const custPayments = customerObj
    ? allPaymentRecords
        .filter((pr) => pr.type === 'customer_collection' && pr.partyId === customerObj.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const usedFromPr = new Map<string, number>();
  const previousDueItems: InvoicePreviousDueItem[] = [];
  const appliedPaymentLines: InvoiceAppliedPaymentLine[] = [];

  // 1. Previous unpaid/partial invoices + any payment records tied to them
  previousSalesWithDue.forEach((prev) => {
    let recordedPaidOnPrev = 0;

    custPayments.forEach((pr) => {
      let allocAmt = 0;
      if (pr.allocations && pr.allocations.length > 0) {
        const match = pr.allocations.find(
          (a) => a.saleId === prev.id || a.invoiceNo === prev.invoiceNo
        );
        if (match) allocAmt = Number(match.amount) || 0;
      } else if (pr.refInvoiceOrPurchaseNo && pr.refInvoiceOrPurchaseNo === prev.invoiceNo) {
        allocAmt = Number(pr.amount) || 0;
      }

      if (allocAmt > 0) {
        const alreadyUsed = usedFromPr.get(pr.id) || 0;
        const available = Math.max(0, (Number(pr.amount) || 0) - alreadyUsed);
        const take = Math.min(allocAmt, available);
        if (take > 0) {
          usedFromPr.set(pr.id, alreadyUsed + take);
          recordedPaidOnPrev += take;
          appliedPaymentLines.push({
            id: `${pr.id}-${prev.id}`,
            date: pr.date,
            label: `পরিশোধ (#${prev.invoiceNo})`,
            amount: take,
          });
        }
      }
    });

    const prevGrossDue = Math.min(prev.grandTotal, (prev.dueAmount || 0) + recordedPaidOnPrev);
    previousDueItems.push({
      id: prev.id,
      date: prev.date,
      label: `ইনভয়েস #${prev.invoiceNo}`,
      amount: prevGrossDue,
    });
  });

  // 2. Opening balance & payments applied toward opening balance
  if (openingBalanceDue > 0) {
    previousDueItems.push({
      id: 'opening-balance',
      date: customerObj?.createdAt || sale.date,
      label: 'পূর্বের হিসাব (Opening)',
      amount: originalOpeningBalance,
    });

    let remainingOpeningToExplain = openingBalancePaid;

    // Pass 1: Explicit openingBalancePaid recorded on PaymentRecord
    if (remainingOpeningToExplain > 0) {
      custPayments.forEach((pr) => {
        if (remainingOpeningToExplain <= 0) return;
        const explicitOpen = Number(pr.openingBalancePaid) || 0;
        if (explicitOpen > 0) {
          const alreadyUsed = usedFromPr.get(pr.id) || 0;
          const available = Math.max(0, (Number(pr.amount) || 0) - alreadyUsed);
          const take = Math.min(explicitOpen, available, remainingOpeningToExplain);
          if (take > 0) {
            usedFromPr.set(pr.id, alreadyUsed + take);
            remainingOpeningToExplain -= take;
            appliedPaymentLines.push({
              id: `${pr.id}-open-exp`,
              date: pr.date,
              label: `বকেয়া পরিশোধ (${pr.receiptNo || 'রশিদ'})`,
              amount: take,
            });
          }
        }
      });
    }

    // Pass 2: Legacy general collections without invoice allocation
    if (remainingOpeningToExplain > 0) {
      custPayments.forEach((pr) => {
        if (remainingOpeningToExplain <= 0) return;
        if (pr.refInvoiceOrPurchaseNo) return;
        const alreadyUsed = usedFromPr.get(pr.id) || 0;
        const available = Math.max(0, (Number(pr.amount) || 0) - alreadyUsed);
        if (available > 0) {
          const take = Math.min(available, remainingOpeningToExplain);
          usedFromPr.set(pr.id, alreadyUsed + take);
          remainingOpeningToExplain -= take;
          appliedPaymentLines.push({
            id: `${pr.id}-open-gen`,
            date: pr.date,
            label: `বকেয়া পরিশোধ (${pr.receiptNo || 'রশিদ'})`,
            amount: take,
          });
        }
      });
    }

    // Pass 3: Any leftover unattributed payment record
    if (remainingOpeningToExplain > 0) {
      custPayments.forEach((pr) => {
        if (remainingOpeningToExplain <= 0) return;
        const alreadyUsed = usedFromPr.get(pr.id) || 0;
        const available = Math.max(0, (Number(pr.amount) || 0) - alreadyUsed);
        if (available > 0) {
          const take = Math.min(available, remainingOpeningToExplain);
          usedFromPr.set(pr.id, alreadyUsed + take);
          remainingOpeningToExplain -= take;
          appliedPaymentLines.push({
            id: `${pr.id}-open-rem`,
            date: pr.date,
            label: `বকেয়া পরিশোধ (${pr.receiptNo || 'রশিদ'})`,
            amount: take,
          });
        }
      });
    }

    // Pass 4: Fallback if paid without a payment record
    if (remainingOpeningToExplain > 0) {
      appliedPaymentLines.push({
        id: 'opening-paid-fallback',
        date: customerObj?.createdAt || sale.date,
        label: 'পূর্বের হিসাব পরিশোধ',
        amount: remainingOpeningToExplain,
      });
    }
  }

  appliedPaymentLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const previousDuesSummaryList = [
    ...previousSalesWithDue.map((p) => ({
      invoiceNo: p.invoiceNo,
      date: p.date,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      dueAmount: p.dueAmount,
    })),
    ...(openingBalanceDue > 0
      ? [
          {
            invoiceNo: 'পূর্ববর্তী হিসাবের জের',
            date: customerObj?.createdAt || sale.date,
            grandTotal: originalOpeningBalance,
            paidAmount: openingBalancePaid,
            dueAmount: openingBalanceDue,
          },
        ]
      : []),
  ];

  return {
    totalPreviousDueFromSales,
    customerTotalDueInDirectory,
    totalCustomerDueCombined,
    totalPreviousDueCombined,
    openingBalanceDue,
    originalOpeningBalance,
    openingBalancePaid,
    previousDueItems,
    appliedPaymentLines,
    previousDuesSummaryList,
  };
}
