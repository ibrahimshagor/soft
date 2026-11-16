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
