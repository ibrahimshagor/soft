export function formatBDT(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '৳ 0';
  return '৳ ' + Math.round(amount).toLocaleString('en-IN');
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove spaces, hyphens, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // If Bangladesh local number (e.g. 017xxxxxxxx), add country code 88
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  }
  return cleaned;
}

export function getWhatsAppInvoiceText(
  businessName: string,
  invoiceNo: string,
  date: string,
  customerName: string,
  items: Array<{ productName: string; quantity: number; sellingPrice: number; total: number }>,
  grandTotal: number,
  paidAmount: number,
  dueAmount: number,
  _shopPhone?: string,
  _shopAddress?: string,
  deliveryCharge: number = 0,
  returnAdjustment?: {
    isAdjusted?: boolean;
    originalTotal?: number;
    returnedAmount?: number;
    reason?: string;
  },
  totalCustomerDue?: number,
  previousDuesList?: Array<{
    invoiceNo: string;
    date: string;
    dueAmount: number;
    grandTotal?: number;
    paidAmount?: number;
  }>
): string {
  // Only display active items with quantity > 0
  const activeItems = items.filter((i) => i.quantity > 0);
  const itemsSummary = activeItems
    .map((item: any, index) => {
      const details = [
        item.productCode ? `Code: ${item.productCode}` : '',
        item.category ? `Category: ${item.category}` : '',
        item.brand ? `Brand: ${item.brand}` : '',
        item.condition ? `[${item.condition}]` : '',
        item.origin ? `Origin: ${item.origin}` : '',
        item.vehicleModel ? `Model: ${item.vehicleModel}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      return `${index + 1}. *${item.productName}* (x${item.quantity}) - Tk. ${Math.round(item.total).toLocaleString()}${
        details ? `\n   ↳ ${details}` : ''
      }`;
    })
    .join('\n');

  const statusText =
    dueAmount <= 0
      ? '[PAID / পরিশোধিত]'
      : `[DUE / বকেয়া: Tk. ${Math.round(dueAmount).toLocaleString()}]`;

  const deliveryLine =
    deliveryCharge > 0 ? `*Delivery Charge:* Tk. ${Math.round(deliveryCharge).toLocaleString()}\n` : '';

  let adjustmentSection = '';
  if (returnAdjustment?.isAdjusted && returnAdjustment.returnedAmount) {
    adjustmentSection = `\n🔄 *সংশোধিত ইনভয়েস (Adjusted after Return):*\n• পূর্ববর্তী বিল: Tk. ${Math.round(returnAdjustment.originalTotal || grandTotal).toLocaleString()}\n• পণ্য ফেরত সমন্বয়: -Tk. ${Math.round(returnAdjustment.returnedAmount).toLocaleString()}\n• বর্তমান সমন্বিত মোট: Tk. ${Math.round(grandTotal).toLocaleString()}\n---------------------------------`;
  }

  // Previous Unpaid Invoices Itemized Breakdown
  let previousDuesSection = '';
  if (previousDuesList && previousDuesList.length > 0) {
    const prevTotal = previousDuesList.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
    previousDuesSection = `\n📋 *পূর্বের বকেয়া ইনভয়েসের তালিকা (Previous Due Invoices):*\n` +
      previousDuesList
        .map((p) => {
          if (p.grandTotal !== undefined && p.paidAmount !== undefined) {
            return ` • ${formatDate(p.date)} [#${p.invoiceNo}]: মোট Tk. ${Math.round(p.grandTotal).toLocaleString()} | জমা Tk. ${Math.round(p.paidAmount).toLocaleString()} | বকেয়া Tk. ${Math.round(p.dueAmount).toLocaleString()}`;
          }
          return ` • ${formatDate(p.date)} [#${p.invoiceNo}]: বকেয়া Tk. ${Math.round(p.dueAmount).toLocaleString()}`;
        })
        .join('\n') +
      `\n👉 *পূর্বের মোট বকেয়া:* Tk. ${Math.round(prevTotal).toLocaleString()}\n---------------------------------`;
  }

  // Only show overall customer due if there is an active due
  const overallDueLine =
    totalCustomerDue !== undefined && totalCustomerDue > 0
      ? `\n🔴 *সর্বমোট বকেয়া (চলতি + পূর্বের মোট বকেয়া):* Tk. ${Math.round(totalCustomerDue).toLocaleString()}`
      : '';

  return `*${businessName}* [Auto Spare Parts]
*Invoice / Cash Memo:* #${invoiceNo} ${returnAdjustment?.isAdjusted ? '*(সংশোধিত / Adjusted)*' : ''}
*Date:* ${formatDate(date)}
*Customer:* ${customerName}
---------------------------------
*Items:*
${itemsSummary || '(All original items were returned)'}
---------------------------------${adjustmentSection}
${deliveryLine}*Net Total Bill:* Tk. ${Math.round(grandTotal).toLocaleString()}
*Paid Amount:* Tk. ${Math.round(paidAmount).toLocaleString()}
*Due Balance (চলতি মেমোর বকেয়া):* Tk. ${Math.round(dueAmount).toLocaleString()}${previousDuesSection}${overallDueLine}
*Status:* ${statusText}
---------------------------------
Thank you for doing business with *${businessName}*!`;
}

export function generateWhatsAppInvoiceUrl(
  phone: string,
  businessName: string,
  invoiceNo: string,
  date: string,
  customerName: string,
  items: Array<{ productName: string; quantity: number; sellingPrice: number; total: number }>,
  grandTotal: number,
  paidAmount: number,
  dueAmount: number,
  shopPhone: string,
  shopAddress: string,
  deliveryCharge: number = 0,
  returnAdjustment?: {
    isAdjusted?: boolean;
    originalTotal?: number;
    returnedAmount?: number;
    reason?: string;
  },
  totalCustomerDue?: number,
  previousDuesList?: Array<{
    invoiceNo: string;
    date: string;
    dueAmount: number;
    grandTotal?: number;
    paidAmount?: number;
  }>
): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const message = getWhatsAppInvoiceText(
    businessName,
    invoiceNo,
    date,
    customerName,
    items,
    grandTotal,
    paidAmount,
    dueAmount,
    shopPhone,
    shopAddress,
    deliveryCharge,
    returnAdjustment,
    totalCustomerDue,
    previousDuesList
  );

  // If a specific phone number exists, open direct chat
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  // If no specific phone number (e.g. Walk-in customer), open WhatsApp share dialog to pick any contact
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Resolves the true WhatsApp number for a sale by strictly prioritizing:
 * 1. Customer's WhatsApp Number from Customer Directory (even if phone was updated later)
 * 2. Customer's Phone Number from Customer Directory
 * 3. Historical sale recorded customerWhatsapp
 * 4. Historical sale recorded customerPhone
 */
export function resolveCustomerWhatsApp(
  sale: { customerId?: string; customerName?: string; customerWhatsapp?: string; customerPhone?: string },
  customers: Array<{ id: string; name?: string; phone?: string; whatsappNumber?: string }>
): { number: string; isSpecificWhatsApp: boolean } {
  // 1. Try finding customer by customerId
  let customer = customers.find((c) => c.id && c.id === sale.customerId);

  // 2. If not matched by ID (or walk-in was renamed or ID missing), search customer directory by matching Name
  if (!customer && sale.customerName && sale.customerName !== 'Walk-in Customer' && sale.customerName !== 'ওয়াক-ইন কাস্টমার') {
    const saleNameLower = sale.customerName.trim().toLowerCase();
    customer = customers.find((c) => c.name && c.name.trim().toLowerCase() === saleNameLower);
  }

  // 3. If still not matched, check if sale's historical phone matches any customer in directory whose number was retained or changed
  if (!customer && sale.customerPhone) {
    const cleanSalePhone = sanitizePhoneNumber(sale.customerPhone);
    if (cleanSalePhone) {
      customer = customers.find(
        (c) =>
          sanitizePhoneNumber(c.phone || '') === cleanSalePhone ||
          sanitizePhoneNumber(c.whatsappNumber || '') === cleanSalePhone
      );
    }
  }

  // STRICT RULE: If the customer exists in Customer Directory, ALWAYS use the latest directory phone/WhatsApp!
  if (customer) {
    if (customer.whatsappNumber && customer.whatsappNumber.trim()) {
      return { number: customer.whatsappNumber.trim(), isSpecificWhatsApp: true };
    }
    if (customer.phone && customer.phone.trim()) {
      return { number: customer.phone.trim(), isSpecificWhatsApp: false };
    }
  }

  // Fallback to sale's historical record only if customer is completely absent from directory
  if (sale.customerWhatsapp && sale.customerWhatsapp.trim()) {
    return { number: sale.customerWhatsapp.trim(), isSpecificWhatsApp: true };
  }

  if (sale.customerPhone && sale.customerPhone.trim()) {
    return { number: sale.customerPhone.trim(), isSpecificWhatsApp: false };
  }

  return { number: '', isSpecificWhatsApp: false };
}


export function generateWhatsAppReceiptUrl(
  phone: string,
  businessName: string,
  receiptNo: string,
  date: string,
  partyName: string,
  amount: number,
  newBalance: number,
  paymentMethod: string,
  shopPhone: string
): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  
  const message = `*${businessName}* - Payment Receipt 🧾
*Receipt No:* #${receiptNo}
*Date:* ${formatDate(date)}
*Received from:* ${partyName}
---------------------------------
*Amount Received:* ${formatBDT(amount)}
*Payment Method:* ${paymentMethod}
*Remaining Balance:* ${formatBDT(newBalance)}
---------------------------------
Thank you for your timely payment!
📞 Support: ${shopPhone}`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let str = String(val ?? '');
        str = str.replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) {
          str = `"${str}"`;
        }
        return str;
      })
      .join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
