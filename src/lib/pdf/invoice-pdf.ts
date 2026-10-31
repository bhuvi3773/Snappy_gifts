import { PdfDocument } from './pdf-writer';
import {
  SellerConfigData,
  EInvoiceStatus,
  InvoiceSignatureMode,
} from '../invoices/seller-config.service';

export interface InvoiceItemSnapshot {
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  unitPricePaise: number;
  taxableAmountPaise: number;
  taxRatePercent: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

export interface TaxInvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string; // e.g. "30/10/2026"
  orderNumber: string;
  orderDate: string;
  isSample: boolean;
  seller: SellerConfigData;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
    gstin?: string | null;
  };
  billingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  placeOfSupply: string;
  isInterState: boolean;
  items: InvoiceItemSnapshot[];
  subtotalTaxablePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  shippingTaxablePaise: number;
  shippingGstPaise: number;
  discountPaise: number;
  totalTaxPaise: number;
  grandTotalPaise: number;
  paymentMethod: string;
  paymentTransactionId?: string | null;

  // Rule 46 & Rule 48(4) E-Invoice & Signature Compliance
  eInvoiceStatus?: EInvoiceStatus;
  irn?: string | null;
  signedQrData?: string | null;
  rule46Declaration?: string | null;
  signatureMode?: InvoiceSignatureMode;
  digitalSignatureDetails?: string | null;
  physicalSignatureConfirmedBy?: string | null;
  physicalSignatureConfirmedAt?: string | Date | null;
}

function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

function convertNumberToWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  if (rupees === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + numToWords(n % 100000);
    return numToWords(Math.floor(n / 10000000)) + 'Crore ' + numToWords(n % 10000000);
  }

  const result = numToWords(rupees).trim();
  const remainderPaise = paise % 100;
  if (remainderPaise > 0) {
    return `${result} Rupees and ${numToWords(remainderPaise).trim()} Paise Only`;
  }
  return `${result} Rupees Only`;
}

/**
 * Builds a compliant GST Tax Invoice PDF according to Section 31 and Rule 46 of CGST Rules 2017.
 */
export function generateTaxInvoicePdf(data: TaxInvoicePdfData): Buffer {
  const doc = new PdfDocument();
  let page = doc.addPage();

  const margin = 36;
  const contentWidth = 595.28 - margin * 2;
  let y = 800;

  function drawWatermark(p: typeof page) {
    p.drawText('SAMPLE / NOT A TAX INVOICE', margin, 740, {
      size: 30,
      font: 'Helvetica-Bold',
      color: [0.92, 0.92, 0.92],
    });
  }

  // Watermark if sample
  if (data.isSample || !data.seller.isVerified) {
    drawWatermark(page);
  }

  // Header Bar
  page.drawRect(margin, y - 25, contentWidth, 30, {
    fillColor: [0.08, 0.15, 0.28], // Navy
  });
  page.drawText('TAX INVOICE', margin + 12, y - 18, {
    size: 15,
    font: 'Helvetica-Bold',
    color: [1, 1, 1],
  });
  page.drawText('(Issued under Section 31 of CGST Act, 2017 read with Rule 46 of CGST Rules)', margin + 140, y - 16, {
    size: 8,
    font: 'Helvetica',
    color: [0.85, 0.88, 0.92],
  });
  y -= 40;

  if (data.irn) {
    page.drawRect(margin, y - 14, contentWidth, 16, {
      fillColor: [0.94, 0.96, 0.99],
      strokeColor: [0.8, 0.85, 0.92],
      lineWidth: 0.5,
    });
    page.drawText(`IRN (Invoice Reference Number): ${data.irn}`, margin + 8, y - 10, {
      size: 6.5,
      font: 'Courier',
      color: [0.08, 0.15, 0.28],
    });
    if (data.signedQrData) {
      page.drawText('Signed QR Code (IRP Validated)', margin + contentWidth - 140, y - 10, {
        size: 6,
        font: 'Helvetica-Bold',
        color: [0.1, 0.5, 0.2],
      });
    }
    y -= 22;
  }

  // Supplier Details (Left) and Invoice Metadata (Right)
  const leftX = margin;
  const rightX = margin + 300;

  // Supplier Section
  page.drawText(data.seller.legalName.toUpperCase(), leftX, y, { size: 10, font: 'Helvetica-Bold' });
  y -= 12;
  page.drawText(data.seller.tradeName ? `(Trade: ${data.seller.tradeName})` : '', leftX, y, {
    size: 8,
    font: 'Helvetica-Oblique',
  });
  y -= 12;
  page.drawText(data.seller.registeredStreet, leftX, y, { size: 8 });
  y -= 10;
  page.drawText(`${data.seller.city}, ${data.seller.state} - ${data.seller.pincode}, India`, leftX, y, {
    size: 8,
  });
  y -= 10;
  page.drawText(`GSTIN: ${data.seller.gstin}`, leftX, y, { size: 8, font: 'Helvetica-Bold' });
  y -= 10;
  page.drawText(`State: ${data.seller.state} (Code: ${data.seller.stateCode})`, leftX, y, { size: 8 });
  y -= 10;
  page.drawText(`Email: ${data.seller.contactEmail} | Phone: ${data.seller.contactPhone}`, leftX, y, { size: 8 });

  // Right Metadata box
  let metaY = y + 74;
  page.drawRect(rightX, metaY - 74, contentWidth - 300, 84, {
    strokeColor: [0.8, 0.82, 0.85],
    lineWidth: 0.5,
  });
  page.drawText('Invoice No:', rightX + 8, metaY - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText(data.invoiceNumber, rightX + 85, metaY - 12, { size: 8, font: 'Helvetica-Bold' });

  page.drawText('Invoice Date:', rightX + 8, metaY - 26, { size: 8 });
  page.drawText(data.invoiceDate, rightX + 85, metaY - 26, { size: 8 });

  page.drawText('Order Ref:', rightX + 8, metaY - 40, { size: 8 });
  page.drawText(data.orderNumber, rightX + 85, metaY - 40, { size: 8 });

  page.drawText('Order Date:', rightX + 8, metaY - 54, { size: 8 });
  page.drawText(data.orderDate, rightX + 85, metaY - 54, { size: 8 });

  page.drawText('Place of Supply:', rightX + 8, metaY - 68, { size: 8 });
  page.drawText(data.placeOfSupply, rightX + 85, metaY - 68, { size: 8 });

  y -= 16;
  page.drawLine(margin, y, margin + contentWidth, y, { color: [0.85, 0.85, 0.85] });
  y -= 14;

  // Billing & Shipping Details
  page.drawText('BILL TO (Recipient):', leftX, y, { size: 8, font: 'Helvetica-Bold' });
  page.drawText('SHIP TO (Delivery Address):', rightX, y, { size: 8, font: 'Helvetica-Bold' });
  y -= 12;

  page.drawText(data.billingAddress.fullName, leftX, y, { size: 8, font: 'Helvetica-Bold' });
  page.drawText(data.shippingAddress.fullName, rightX, y, { size: 8, font: 'Helvetica-Bold' });
  y -= 10;

  page.drawText(data.billingAddress.addressLine1, leftX, y, { size: 8 });
  page.drawText(data.shippingAddress.addressLine1, rightX, y, { size: 8 });
  y -= 10;

  if (data.billingAddress.addressLine2 || data.shippingAddress.addressLine2) {
    page.drawText(data.billingAddress.addressLine2 || '', leftX, y, { size: 8 });
    page.drawText(data.shippingAddress.addressLine2 || '', rightX, y, { size: 8 });
    y -= 10;
  }

  page.drawText(`${data.billingAddress.city}, ${data.billingAddress.state} - ${data.billingAddress.postalCode}`, leftX, y, {
    size: 8,
  });
  page.drawText(`${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.postalCode}`, rightX, y, {
    size: 8,
  });
  y -= 10;

  page.drawText(`Customer GSTIN: ${data.customer.gstin || 'Unregistered Consumer'}`, leftX, y, { size: 8 });
  page.drawText(`State: ${data.shippingAddress.state}`, rightX, y, { size: 8 });
  y -= 10;

  page.drawText(`Reverse Charge Applicable: NO`, leftX, y, { size: 8, font: 'Helvetica-Oblique' });
  y -= 16;

  // Line Items Table Header
  const tableTop = y;
  page.drawRect(margin, tableTop - 16, contentWidth, 18, {
    fillColor: [0.93, 0.94, 0.96],
  });

  const colX = {
    sno: margin + 4,
    desc: margin + 24,
    hsn: margin + 175,
    qty: margin + 225,
    rate: margin + 255,
    taxable: margin + 305,
    taxRate: margin + 365,
    taxAmt: margin + 405,
    total: margin + 465,
  };

  page.drawText('#', colX.sno, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('Description of Goods', colX.desc, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('HSN/SAC', colX.hsn, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('Qty', colX.qty, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('Unit Rate', colX.rate, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('Taxable (Rs.)', colX.taxable, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('GST %', colX.taxRate, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });
  page.drawText(data.isInterState ? 'IGST (Rs.)' : 'CGST+SGST', colX.taxAmt, tableTop - 12, {
    size: 7,
    font: 'Helvetica-Bold',
  });
  page.drawText('Total (Rs.)', colX.total, tableTop - 12, { size: 7, font: 'Helvetica-Bold' });

  y = tableTop - 28;

  // Table rows
  data.items.forEach((item, index) => {
    // If running out of room on current page, advance to next page
    if (y < 220) {
      page.drawText(
        `Snappy Gifts E-Commerce Platform • Invoice generated electronically • Continued on next page...`,
        margin,
        25,
        { size: 6, color: [0.55, 0.55, 0.55] }
      );
      page = doc.addPage();
      if (data.isSample || !data.seller.isVerified) {
        drawWatermark(page);
      }
      page.drawRect(margin, 800 - 25, contentWidth, 25, { fillColor: [0.08, 0.15, 0.28] });
      page.drawText('TAX INVOICE (Continued)', margin + 12, 800 - 18, {
        size: 11,
        font: 'Helvetica-Bold',
        color: [1, 1, 1],
      });
      page.drawText(
        `Invoice No: ${data.invoiceNumber} | Order: ${data.orderNumber}`,
        margin + 250,
        800 - 16,
        { size: 8, font: 'Helvetica', color: [0.85, 0.88, 0.92] }
      );

      const contTableTop = 755;
      page.drawRect(margin, contTableTop - 16, contentWidth, 18, { fillColor: [0.93, 0.94, 0.96] });
      page.drawText('#', colX.sno, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('Description of Goods', colX.desc, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('HSN/SAC', colX.hsn, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('Qty', colX.qty, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('Unit Rate', colX.rate, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('Taxable (Rs.)', colX.taxable, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText('GST %', colX.taxRate, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      page.drawText(data.isInterState ? 'IGST (Rs.)' : 'CGST+SGST', colX.taxAmt, contTableTop - 12, {
        size: 7,
        font: 'Helvetica-Bold',
      });
      page.drawText('Total (Rs.)', colX.total, contTableTop - 12, { size: 7, font: 'Helvetica-Bold' });
      y = contTableTop - 28;
    }

    const rowColor: [number, number, number] = index % 2 === 0 ? [1, 1, 1] : [0.98, 0.98, 0.99];
    page.drawRect(margin, y - 6, contentWidth, 16, { fillColor: rowColor });

    const totalTax = data.isInterState ? item.igstPaise : item.cgstPaise + item.sgstPaise;
    const safeDesc = item.productName.length > 28 ? item.productName.substring(0, 26) + '...' : item.productName;

    page.drawText(String(index + 1), colX.sno, y, { size: 7 });
    page.drawText(safeDesc, colX.desc, y, { size: 7 });
    page.drawText(item.hsnCode || 'N/A', colX.hsn, y, { size: 7 });
    page.drawText(String(item.quantity), colX.qty, y, { size: 7 });
    page.drawText(formatInr(item.unitPricePaise), colX.rate, y, { size: 7 });
    page.drawText(formatInr(item.taxableAmountPaise), colX.taxable, y, { size: 7 });
    page.drawText(`${item.taxRatePercent}%`, colX.taxRate, y, { size: 7 });
    page.drawText(formatInr(totalTax), colX.taxAmt, y, { size: 7 });
    page.drawText(formatInr(item.totalPaise), colX.total, y, { size: 7, font: 'Helvetica-Bold' });

    y -= 16;
  });

  // Shipping row if shipping taxable > 0
  if (data.shippingTaxablePaise > 0) {
    if (y < 220) {
      page = doc.addPage();
      if (data.isSample || !data.seller.isVerified) {
        drawWatermark(page);
      }
      y = 755;
    }
    page.drawRect(margin, y - 6, contentWidth, 16, { fillColor: [0.98, 0.98, 0.99] });
    page.drawText('•', colX.sno, y, { size: 7 });
    page.drawText('Shipping & Handling Charges', colX.desc, y, { size: 7 });
    page.drawText('996813', colX.hsn, y, { size: 7 });
    page.drawText('1', colX.qty, y, { size: 7 });
    page.drawText(formatInr(data.shippingTaxablePaise), colX.rate, y, { size: 7 });
    page.drawText(formatInr(data.shippingTaxablePaise), colX.taxable, y, { size: 7 });
    page.drawText('18%', colX.taxRate, y, { size: 7 });
    page.drawText(formatInr(data.shippingGstPaise), colX.taxAmt, y, { size: 7 });
    page.drawText(formatInr(data.shippingTaxablePaise + data.shippingGstPaise), colX.total, y, {
      size: 7,
      font: 'Helvetica-Bold',
    });
    y -= 16;
  }

  // Draw bottom border of table
  page.drawLine(margin, y + 8, margin + contentWidth, y + 8, { color: [0.75, 0.75, 0.75] });
  y -= 8;

  // If remaining space on current page is not enough for summary box & signatures, advance
  if (y < 200) {
    page.drawText(
      `Snappy Gifts E-Commerce Platform • Invoice generated electronically • Continued on next page...`,
      margin,
      25,
      { size: 6, color: [0.55, 0.55, 0.55] }
    );
    page = doc.addPage();
    if (data.isSample || !data.seller.isVerified) {
      drawWatermark(page);
    }
    page.drawRect(margin, 800 - 25, contentWidth, 25, { fillColor: [0.08, 0.15, 0.28] });
    page.drawText('TAX INVOICE (Summary & Declaration)', margin + 12, 800 - 18, {
      size: 11,
      font: 'Helvetica-Bold',
      color: [1, 1, 1],
    });
    page.drawText(
      `Invoice No: ${data.invoiceNumber} | Order: ${data.orderNumber}`,
      margin + 250,
      800 - 16,
      { size: 8, font: 'Helvetica', color: [0.85, 0.88, 0.92] }
    );
    y = 750;
  }

  // Summary box (Right side) & Amount in Words (Left side)
  const summaryLeft = margin + 320;
  const summaryWidth = contentWidth - 320;

  // Words & Notes on left
  page.drawText('Amount Chargeable in Words:', margin, y, { size: 7, font: 'Helvetica-Bold' });
  y -= 10;
  page.drawText(convertNumberToWords(data.grandTotalPaise), margin, y, {
    size: 7,
    font: 'Helvetica-Oblique',
  });
  y -= 18;

  page.drawText('Payment Information:', margin, y, { size: 7, font: 'Helvetica-Bold' });
  y -= 10;
  page.drawText(`Payment Method: ${data.paymentMethod.toUpperCase()}`, margin, y, { size: 7 });
  y -= 9;
  if (data.paymentTransactionId) {
    page.drawText(`Transaction Ref: ${data.paymentTransactionId}`, margin, y, { size: 7 });
    y -= 9;
  }
  page.drawText(`Payment Status: CONFIRMED / PAID`, margin, y, { size: 7 });
  y -= 14;

  // Tax Breakdown Box (Left)
  page.drawText('Tax Summary:', margin, y, { size: 7, font: 'Helvetica-Bold' });
  y -= 9;
  if (data.isInterState) {
    page.drawText(`Integrated Tax (IGST 18%): Rs. ${formatInr(data.totalIgstPaise + data.shippingGstPaise)}`, margin, y, {
      size: 7,
    });
  } else {
    page.drawText(
      `Central Tax (CGST 9%): Rs. ${formatInr(data.totalCgstPaise + Math.floor(data.shippingGstPaise / 2))}`,
      margin,
      y,
      { size: 7 }
    );
    y -= 9;
    page.drawText(
      `State Tax (SGST 9%): Rs. ${formatInr(data.totalSgstPaise + (data.shippingGstPaise - Math.floor(data.shippingGstPaise / 2)))}`,
      margin,
      y,
      { size: 7 }
    );
  }

  // Draw Right Summary Box
  let sY = y + 50;
  page.drawRect(summaryLeft, sY - 76, summaryWidth, 86, {
    strokeColor: [0.8, 0.8, 0.8],
    lineWidth: 0.5,
  });

  page.drawText('Total Taxable Value:', summaryLeft + 8, sY - 12, { size: 7 });
  page.drawText(`Rs. ${formatInr(data.subtotalTaxablePaise + data.shippingTaxablePaise)}`, summaryLeft + 120, sY - 12, {
    size: 7,
  });

  if (!data.isInterState) {
    page.drawText('Total CGST (9%):', summaryLeft + 8, sY - 24, { size: 7 });
    page.drawText(
      `Rs. ${formatInr(data.totalCgstPaise + Math.floor(data.shippingGstPaise / 2))}`,
      summaryLeft + 120,
      sY - 24,
      { size: 7 }
    );

    page.drawText('Total SGST (9%):', summaryLeft + 8, sY - 36, { size: 7 });
    page.drawText(
      `Rs. ${formatInr(data.totalSgstPaise + (data.shippingGstPaise - Math.floor(data.shippingGstPaise / 2)))}`,
      summaryLeft + 120,
      sY - 36,
      { size: 7 }
    );
  } else {
    page.drawText('Total IGST (18%):', summaryLeft + 8, sY - 24, { size: 7 });
    page.drawText(
      `Rs. ${formatInr(data.totalIgstPaise + data.shippingGstPaise)}`,
      summaryLeft + 120,
      sY - 24,
      { size: 7 }
    );
  }

  if (data.discountPaise > 0) {
    page.drawText('Discount Applied:', summaryLeft + 8, sY - 48, { size: 7 });
    page.drawText(`- Rs. ${formatInr(data.discountPaise)}`, summaryLeft + 120, sY - 48, { size: 7 });
  }

  page.drawLine(summaryLeft, sY - 56, summaryLeft + summaryWidth, sY - 56, { color: [0.75, 0.75, 0.75] });

  // Grand Total highlight
  page.drawRect(summaryLeft, sY - 76, summaryWidth, 20, {
    fillColor: [0.93, 0.95, 0.98],
  });
  page.drawText('Grand Total:', summaryLeft + 8, sY - 68, { size: 8, font: 'Helvetica-Bold' });
  page.drawText(`Rs. ${formatInr(data.grandTotalPaise)}`, summaryLeft + 115, sY - 68, {
    size: 9,
    font: 'Helvetica-Bold',
    color: [0.08, 0.15, 0.28],
  });

  // Footer & Authorized Signatory
  y -= 35;
  page.drawLine(margin, y, margin + contentWidth, y, { color: [0.85, 0.85, 0.85] });
  y -= 16;

  page.drawText('Declaration / Terms & Conditions:', margin, y, { size: 7, font: 'Helvetica-Bold' });
  y -= 9;

  if (data.rule46Declaration) {
    page.drawText('STATUTORY DECLARATION UNDER RULE 46(s) OF CGST RULES, 2017:', margin, y, {
      size: 6.5,
      font: 'Helvetica-Bold',
      color: [0.08, 0.15, 0.28],
    });
    y -= 8;
    page.drawText(
      'I/We hereby declare that though our aggregate turnover in any preceding financial year from 2017-18 onwards',
      margin,
      y,
      { size: 5.5, font: 'Helvetica-Oblique' }
    );
    y -= 7;
    page.drawText(
      'is more than the aggregate turnover notified under sub-rule (4) of rule 48, we are not required to prepare an invoice',
      margin,
      y,
      { size: 5.5, font: 'Helvetica-Oblique' }
    );
    y -= 7;
    page.drawText(
      'in terms of the provisions of the said sub-rule.',
      margin,
      y,
      { size: 5.5, font: 'Helvetica-Oblique' }
    );
    y -= 8;
  }

  page.drawText('1. We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', margin, y, { size: 6 });
  y -= 8;
  page.drawText('2. Goods once sold will be accepted for exchange/return strictly in accordance with Snappy Gifts return policies.', margin, y, { size: 6 });
  y -= 8;
  page.drawText('3. All disputes are subject to Jaipur, Rajasthan jurisdiction only.', margin, y, { size: 6 });

  // Signature Block on right
  const signY = y + 25;
  const signatureMode = data.signatureMode || data.seller.signatureMode || 'PHYSICAL_SIGNATURE_ON_PRINT';

  page.drawText(`For ${data.seller.legalName}`, rightX + 10, signY, { size: 8, font: 'Helvetica-Bold' });

  if (signatureMode === 'PHYSICAL_SIGNATURE_ON_PRINT') {
    if (data.physicalSignatureConfirmedAt && data.physicalSignatureConfirmedBy) {
      // Authenticated physical signature confirmation seal (CGST Rule 46(q))
      page.drawRect(rightX + 8, signY - 44, 185, 48, {
        strokeColor: [0.15, 0.5, 0.25],
        lineWidth: 0.8,
        fillColor: [0.96, 0.99, 0.96],
      });
      page.drawText('AUTHENTICATED PHYSICAL SIGNATURE', rightX + 12, signY - 8, {
        size: 6.5,
        font: 'Helvetica-Bold',
        color: [0.08, 0.45, 0.18],
      });
      page.drawText(
        `Physically Signed on Print by: ${data.physicalSignatureConfirmedBy}`,
        rightX + 12,
        signY - 18,
        { size: 6, font: 'Helvetica-Bold' }
      );
      const confDate = new Date(data.physicalSignatureConfirmedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      page.drawText(
        `Dispatched & Verified: ${confDate}`,
        rightX + 12,
        signY - 26,
        { size: 5.5, color: [0.2, 0.2, 0.2] }
      );
      page.drawText(
        'Physical hardcopy signed & enclosed in shipment (CGST Rule 46(q))',
        rightX + 12,
        signY - 34,
        { size: 5, font: 'Helvetica-Oblique', color: [0.3, 0.3, 0.3] }
      );
      page.drawText(
        'Valid tax invoice authentication under CGST Act & Rules, 2017',
        rightX + 12,
        signY - 41,
        { size: 4.5, font: 'Helvetica', color: [0.4, 0.4, 0.4] }
      );
    } else {
      page.drawLine(rightX + 10, signY - 20, rightX + 180, signY - 20, {
        color: [0.7, 0.7, 0.7],
        lineWidth: 0.5,
      });
      page.drawText('Authorized Signatory (Physical Signature Required)', rightX + 10, signY - 30, {
        size: 6.5,
        font: 'Helvetica-Bold',
      });
      page.drawText(
        'Must be physically signed upon print prior to dispatch removal (CGST Rule 46(q))',
        rightX + 10,
        signY - 38,
        { size: 5.5, font: 'Helvetica-Oblique', color: [0.35, 0.35, 0.35] }
      );
    }
  } else if (signatureMode === 'DIGITAL_SIGNATURE_IT_ACT') {
    page.drawText('Digitally Signed (Information Technology Act, 2000)', rightX + 10, signY - 14, {
      size: 6.5,
      font: 'Helvetica-Bold',
    });
    page.drawText(
      `Signatory: ${data.seller.authorizedSignatoryName || 'Authorized Representative'}`,
      rightX + 10,
      signY - 22,
      { size: 6 }
    );
    page.drawText(
      `Certificate: ${data.digitalSignatureDetails || 'Verified Licensed CA DSC Token (Section 5 IT Act)'}`,
      rightX + 10,
      signY - 30,
      { size: 5.5, font: 'Helvetica-Oblique' }
    );
  } else if (signatureMode === 'ELECTRONIC_INVOICE_EXCEPTION' || signatureMode === 'E_INVOICE_IRP_QR') {
    page.drawText('Electronic Invoice (CGST Rule 46 Proviso)', rightX + 10, signY - 14, {
      size: 6.5,
      font: 'Helvetica-Bold',
    });
    page.drawText(
      'Signature exempt per Rule 46 Second Proviso (Rule 48(4) e-invoice)',
      rightX + 10,
      signY - 22,
      { size: 5.5, font: 'Helvetica-Oblique' }
    );
    if (data.irn) {
      page.drawText(`IRN: ${data.irn.substring(0, 20)}...`, rightX + 10, signY - 30, {
        size: 5,
        font: 'Courier',
      });
    }
  }

  // Bottom system footer
  let footerNotice =
    data.physicalSignatureConfirmedAt
      ? 'Snappy Gifts E-Commerce Platform • Tax Invoice under CGST Rule 46 • Physically signed by authorized representative prior to dispatch'
      : 'Snappy Gifts E-Commerce Platform • Tax Invoice under CGST Rule 46 • Physical signature of supplier/authorized representative required upon print';
  if (signatureMode === 'DIGITAL_SIGNATURE_IT_ACT') {
    footerNotice =
      'Snappy Gifts E-Commerce Platform • Electronic Invoice authenticated with Digital Signature pursuant to IT Act 2000 Section 5 & Rule 46 Proviso';
  } else if (signatureMode === 'ELECTRONIC_INVOICE_EXCEPTION' || signatureMode === 'E_INVOICE_IRP_QR') {
    footerNotice =
      'Snappy Gifts E-Commerce Platform • Electronic Invoice under CGST Rule 46 Proviso & Rule 48(4) registered on IRP';
  }

  page.drawText(footerNotice, margin, 25, { size: 6, color: [0.55, 0.55, 0.55] });

  return doc.write();
}
