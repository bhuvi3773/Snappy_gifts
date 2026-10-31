import { PdfDocument } from './pdf-writer';
import { SellerConfigData } from '../invoices/seller-config.service';

export interface PackingSlipItem {
  productName: string;
  sku: string;
  quantity: number;
  personalizationText?: string | null;
  personalizationDetails?: string | null;
}

export interface PackingSlipPdfData {
  orderNumber: string;
  orderDate: string;
  shipmentReference?: string | null;
  awbNumber?: string | null;
  seller: SellerConfigData;
  recipient: {
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  deliveryAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: PackingSlipItem[];
  dispatchNotes?: string | null;
}

/**
 * Builds a secure fulfillment Packing Slip PDF.
 * STRICT SECURITY REQUIREMENT:
 * Packing slips MUST NOT expose product prices, totals, GST amounts, payment credentials,
 * internal staff notes, or private storage paths.
 */
export function generatePackingSlipPdf(data: PackingSlipPdfData): Buffer {
  const doc = new PdfDocument();
  let page = doc.addPage();

  const margin = 36;
  const contentWidth = 595.28 - margin * 2;
  let y = 800;

  // Header Bar
  page.drawRect(margin, y - 25, contentWidth, 30, {
    fillColor: [0.18, 0.28, 0.42], // Slate / Steel Blue
  });
  page.drawText('PACKING SLIP / DISPATCH NOTE', margin + 12, y - 18, {
    size: 14,
    font: 'Helvetica-Bold',
    color: [1, 1, 1],
  });
  page.drawText('CONFIDENTIAL • FOR FULFILLMENT & LOGISTICS ONLY', margin + 280, y - 16, {
    size: 8,
    font: 'Helvetica-Bold',
    color: [0.9, 0.93, 0.98],
  });
  y -= 45;

  const leftX = margin;
  const rightX = margin + 300;

  // Dispatch Origin (Left)
  page.drawText('DISPATCH FROM:', leftX, y, { size: 8, font: 'Helvetica-Bold' });
  y -= 12;
  page.drawText(data.seller.legalName.toUpperCase(), leftX, y, { size: 9, font: 'Helvetica-Bold' });
  y -= 11;
  page.drawText(`Fulfillment Warehouse: ${data.seller.city}, ${data.seller.state}`, leftX, y, { size: 8 });
  y -= 10;
  page.drawText(`Support Contact: ${data.seller.contactEmail} | ${data.seller.contactPhone}`, leftX, y, { size: 8 });

  // Shipment / Order Box (Right)
  let metaY = y + 33;
  page.drawRect(rightX, metaY - 55, contentWidth - 300, 65, {
    strokeColor: [0.8, 0.82, 0.85],
    lineWidth: 0.5,
  });

  page.drawText('Order Ref:', rightX + 8, metaY - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText(data.orderNumber, rightX + 80, metaY - 12, { size: 8, font: 'Helvetica-Bold' });

  page.drawText('Order Date:', rightX + 8, metaY - 26, { size: 8 });
  page.drawText(data.orderDate, rightX + 80, metaY - 26, { size: 8 });

  if (data.awbNumber || data.shipmentReference) {
    page.drawText('AWB / Tracking:', rightX + 8, metaY - 40, { size: 8, font: 'Helvetica-Bold' });
    page.drawText(data.awbNumber || data.shipmentReference || 'Pending', rightX + 80, metaY - 40, {
      size: 8,
      font: 'Helvetica-Bold',
    });
  }

  y -= 25;
  page.drawLine(margin, y, margin + contentWidth, y, { color: [0.85, 0.85, 0.85] });
  y -= 14;

  // Deliver To Section
  page.drawText('DELIVER TO (Recipient):', leftX, y, { size: 8, font: 'Helvetica-Bold' });
  y -= 12;

  page.drawText(data.deliveryAddress.fullName, leftX, y, { size: 9, font: 'Helvetica-Bold' });
  y -= 11;
  page.drawText(data.deliveryAddress.addressLine1, leftX, y, { size: 8 });
  y -= 10;
  if (data.deliveryAddress.addressLine2) {
    page.drawText(data.deliveryAddress.addressLine2, leftX, y, { size: 8 });
    y -= 10;
  }
  page.drawText(
    `${data.deliveryAddress.city}, ${data.deliveryAddress.state} - ${data.deliveryAddress.postalCode}, ${data.deliveryAddress.country}`,
    leftX,
    y,
    { size: 8, font: 'Helvetica-Bold' }
  );
  y -= 10;
  if (data.recipient.phone) {
    page.drawText(`Phone: ${data.recipient.phone}`, leftX, y, { size: 8 });
    y -= 10;
  }
  if (data.recipient.email) {
    page.drawText(`Email: ${data.recipient.email}`, leftX, y, { size: 8 });
    y -= 10;
  }

  y -= 12;

  // Items Table Header
  const tableTop = y;
  page.drawRect(margin, tableTop - 16, contentWidth, 18, {
    fillColor: [0.92, 0.94, 0.96],
  });

  const colX = {
    sno: margin + 6,
    sku: margin + 30,
    desc: margin + 130,
    qty: margin + 410,
    check: margin + 470,
  };

  page.drawText('#', colX.sno, tableTop - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText('SKU', colX.sku, tableTop - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText('Item Description & Personalization', colX.desc, tableTop - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText('Qty', colX.qty, tableTop - 12, { size: 8, font: 'Helvetica-Bold' });
  page.drawText('Packed [✓]', colX.check, tableTop - 12, { size: 8, font: 'Helvetica-Bold' });

  y = tableTop - 28;

  let totalUnits = 0;

  data.items.forEach((item, index) => {
    // If running out of room on current page, advance to next page
    if (y < 120) {
      page.drawText(
        'Snappy Gifts Fulfillment • Continued on next page...',
        margin,
        25,
        { size: 6, color: [0.55, 0.55, 0.55] }
      );
      page = doc.addPage();
      page.drawRect(margin, 800 - 25, contentWidth, 25, { fillColor: [0.18, 0.28, 0.42] });
      page.drawText('PACKING SLIP (Continued)', margin + 12, 800 - 18, {
        size: 12,
        font: 'Helvetica-Bold',
        color: [1, 1, 1],
      });
      page.drawText(`Order Ref: ${data.orderNumber}`, margin + 350, 800 - 16, {
        size: 8,
        font: 'Helvetica-Bold',
        color: [0.9, 0.93, 0.98],
      });

      const contTableTop = 750;
      page.drawRect(margin, contTableTop - 16, contentWidth, 18, { fillColor: [0.92, 0.94, 0.96] });
      page.drawText('#', colX.sno, contTableTop - 12, { size: 8, font: 'Helvetica-Bold' });
      page.drawText('SKU', colX.sku, contTableTop - 12, { size: 8, font: 'Helvetica-Bold' });
      page.drawText('Item Description & Personalization', colX.desc, contTableTop - 12, {
        size: 8,
        font: 'Helvetica-Bold',
      });
      page.drawText('Qty', colX.qty, contTableTop - 12, { size: 8, font: 'Helvetica-Bold' });
      page.drawText('Packed [✓]', colX.check, contTableTop - 12, { size: 8, font: 'Helvetica-Bold' });
      y = contTableTop - 28;
    }

    totalUnits += item.quantity;
    const hasPersonalization = Boolean(item.personalizationText || item.personalizationDetails);
    const rowHeight = hasPersonalization ? 28 : 18;

    const rowColor: [number, number, number] = index % 2 === 0 ? [1, 1, 1] : [0.98, 0.98, 0.99];
    page.drawRect(margin, y - (rowHeight - 12), contentWidth, rowHeight, { fillColor: rowColor });

    page.drawText(String(index + 1), colX.sno, y, { size: 8 });
    page.drawText(item.sku || 'N/A', colX.sku, y, { size: 8, font: 'Courier' });

    // Truncate name if long
    const safeName = item.productName.length > 45 ? item.productName.substring(0, 42) + '...' : item.productName;
    page.drawText(safeName, colX.desc, y, { size: 8, font: 'Helvetica-Bold' });

    page.drawText(String(item.quantity), colX.qty, y, { size: 8, font: 'Helvetica-Bold' });
    // Checkbox box for warehouse picker
    page.drawRect(colX.check + 6, y - 2, 12, 12, { strokeColor: [0.6, 0.6, 0.6], lineWidth: 0.8 });

    if (hasPersonalization) {
      y -= 11;
      const details = [
        item.personalizationText ? `Text: "${item.personalizationText}"` : null,
        item.personalizationDetails || null,
      ]
        .filter(Boolean)
        .join(' | ');
      page.drawText(`[Customization: ${details}]`, colX.desc, y, {
        size: 7,
        font: 'Helvetica-Oblique',
        color: [0.2, 0.35, 0.55],
      });
    }

    y -= 18;
  });

  page.drawLine(margin, y + 8, margin + contentWidth, y + 8, { color: [0.75, 0.75, 0.75] });
  y -= 8;

  // If remaining space on current page is not enough for verification & QA box, advance
  if (y < 100) {
    page.drawText(
      'Snappy Gifts Fulfillment • Continued on next page...',
      margin,
      25,
      { size: 6, color: [0.55, 0.55, 0.55] }
    );
    page = doc.addPage();
    page.drawRect(margin, 800 - 25, contentWidth, 25, { fillColor: [0.18, 0.28, 0.42] });
    page.drawText('PACKING SLIP (Fulfillment Sign-Off)', margin + 12, 800 - 18, {
      size: 12,
      font: 'Helvetica-Bold',
      color: [1, 1, 1],
    });
    page.drawText(`Order Ref: ${data.orderNumber}`, margin + 350, 800 - 16, {
      size: 8,
      font: 'Helvetica-Bold',
      color: [0.9, 0.93, 0.98],
    });
    y = 750;
  }

  // Total Units Count
  page.drawText(`Total Package Items: ${data.items.length} lines (${totalUnits} total units)`, margin + 300, y, {
    size: 8,
    font: 'Helvetica-Bold',
  });
  y -= 25;

  // Warehouse Instructions / Verification Box
  if (data.dispatchNotes) {
    page.drawText('Special Handling / Packaging Notes:', margin, y, { size: 8, font: 'Helvetica-Bold' });
    y -= 12;
    page.drawText(data.dispatchNotes, margin, y, { size: 8, font: 'Helvetica-Oblique' });
    y -= 20;
  }

  // Quality Assurance / Dispatch Sign-off
  page.drawRect(margin, y - 40, contentWidth, 48, {
    strokeColor: [0.8, 0.82, 0.85],
    lineWidth: 0.5,
  });

  page.drawText('FULFILLMENT QA & PACKING SIGN-OFF:', margin + 8, y - 10, { size: 7, font: 'Helvetica-Bold' });
  page.drawText('Picked By: ___________________', margin + 8, y - 28, { size: 7 });
  page.drawText('Packed By: ___________________', margin + 170, y - 28, { size: 7 });
  page.drawText('QC Inspection: [  ] Passed', margin + 340, y - 28, { size: 7 });

  // Bottom Notice
  page.drawText(
    'Snappy Gifts Fulfillment • Note: Prices, taxes, and payment details are omitted from this document for customer privacy.',
    margin,
    25,
    { size: 6, color: [0.55, 0.55, 0.55] }
  );

  return doc.write();
}
