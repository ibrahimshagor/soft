import { Account, PaymentMethod } from '../types';

/**
 * Finds the most suitable Account for a given Payment Method
 */
export function getMatchingAccountForPaymentMethod(
  paymentMethodId: string,
  paymentMethods: PaymentMethod[],
  accounts: Account[]
): string {
  if (!accounts || accounts.length === 0) return '';
  const method = (paymentMethods || []).find((m) => m.id === paymentMethodId);
  if (!method) return accounts[0]?.id || '';

  const methodName = ((method.name || '') + ' ' + (method.nameBn || '')).toLowerCase();

  // 1. If method mentions Nagad / নগদ (and not cash) -> prioritize matching Nagad account
  if (
    methodName.includes('nagad') ||
    (methodName.includes('নগদ') && !methodName.includes('ক্যাশ') && !methodName.includes('cash'))
  ) {
    const nagadAcc = accounts.find(
      (a) => a.name.toLowerCase().includes('nagad') || a.name.toLowerCase().includes('নগদ')
    );
    if (nagadAcc) return nagadAcc.id;
  }

  // 2. If method mentions bKash / বিকাশ -> prioritize matching bKash account
  if (methodName.includes('bkash') || methodName.includes('বিকাশ')) {
    const bkashAcc = accounts.find(
      (a) => a.name.toLowerCase().includes('bkash') || a.name.toLowerCase().includes('বিকাশ')
    );
    if (bkashAcc) return bkashAcc.id;
  }

  // 3. Explicit default account mapping if valid
  if (method.defaultAccountId) {
    const explicitAcc = accounts.find((a) => a.id === method.defaultAccountId);
    if (explicitAcc) {
      // Guard against corrupted mapping where Nagad method pointed to bKash account
      const isNagadMethod = methodName.includes('nagad') || methodName.includes('নগদ');
      const isBkashAcc =
        explicitAcc.name.toLowerCase().includes('bkash') || explicitAcc.name.toLowerCase().includes('বিকাশ');
      if (!(isNagadMethod && isBkashAcc)) {
        return explicitAcc.id;
      }
    }
  }

  // 4. If method mentions Islami Bank / ইসলামী ব্যাংক
  if (methodName.includes('islami') || methodName.includes('ইসলামী')) {
    const match = accounts.find(
      (a) => a.name.toLowerCase().includes('islami') || a.name.toLowerCase().includes('ইসলামী')
    );
    if (match) return match.id;
  }

  // 5. If method mentions City Bank / সিটি ব্যাংক
  if (methodName.includes('city') || methodName.includes('সিটি')) {
    const match = accounts.find(
      (a) => a.name.toLowerCase().includes('city') || a.name.toLowerCase().includes('সিটি')
    );
    if (match) return match.id;
  }

  // 6. Match by general type: cash -> cash drawer, bank -> bank, mfs -> mfs
  if (method.type === 'cash') {
    const cashAcc = accounts.find((a) => a.type === 'cash' || a.isDefault);
    if (cashAcc) return cashAcc.id;
  } else if (method.type === 'bank') {
    const bankAcc = accounts.find((a) => a.type === 'bank');
    if (bankAcc) return bankAcc.id;
  } else if (method.type === 'mfs') {
    const mfsAcc = accounts.find((a) => a.type === 'mfs');
    if (mfsAcc) return mfsAcc.id;
  }

  // Fallback to default account
  const defaultAcc = accounts.find((a) => a.isDefault);
  return defaultAcc ? defaultAcc.id : accounts[0].id;
}

/**
 * Finds the most suitable Payment Method for a given Account
 */
export function getMatchingPaymentMethodForAccount(
  accountId: string,
  accounts: Account[],
  paymentMethods: PaymentMethod[]
): string {
  if (!paymentMethods || paymentMethods.length === 0) return '';
  const account = (accounts || []).find((a) => a.id === accountId);
  if (!account) return paymentMethods[0]?.id || '';

  const accName = (account.name || '').toLowerCase();

  // Match Nagad specifically
  if (accName.includes('nagad') || accName.includes('নগদ')) {
    const match = paymentMethods.find(
      (p) => p.name.toLowerCase().includes('nagad') || (p.nameBn && p.nameBn.includes('নগদ'))
    );
    if (match) return match.id;
  }

  // Match bKash specifically
  if (accName.includes('bkash') || accName.includes('বিকাশ')) {
    const match = paymentMethods.find(
      (p) => p.name.toLowerCase().includes('bkash') || (p.nameBn && p.nameBn.includes('বিকাশ'))
    );
    if (match) return match.id;
  }

  // Match by explicit defaultAccountId
  const explicitMethod = paymentMethods.find((p) => p.defaultAccountId === accountId);
  if (explicitMethod) return explicitMethod.id;

  // Match Islami Bank
  if (accName.includes('islami') || accName.includes('ইসলামী')) {
    const match = paymentMethods.find(
      (p) => p.name.toLowerCase().includes('islami') || (p.nameBn && p.nameBn.includes('ইসলামী'))
    );
    if (match) return match.id;
  }

  // Match City Bank
  if (accName.includes('city') || accName.includes('সিটি')) {
    const match = paymentMethods.find(
      (p) => p.name.toLowerCase().includes('city') || (p.nameBn && p.nameBn.includes('সিটি'))
    );
    if (match) return match.id;
  }

  // Match by account type
  const typeMatch = paymentMethods.find((p) => p.type === account.type);
  if (typeMatch) return typeMatch.id;

  return paymentMethods[0].id;
}
