import { NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  issueTaxInvoice,
  DEV_INVOICES_STORE,
  InvoiceValidationError,
} from '@/lib/invoices/invoice.service';
import { SellerConfigError } from '@/lib/invoices/seller-config.service';

/**
 * GET /api/admin/invoices
 * Lists tax invoices with optional order number or financial year filtering.
 */
export async function GET(req: Request) {
  try {
    await requireRole([Role.ADMIN, Role.STAFF], req);
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const financialYear = searchParams.get('financialYear')?.trim();

    try {
      const where: any = {};
      if (orderNumber) where.orderNumber = orderNumber;
      if (financialYear) where.financialYear = financialYear;

      const invoices = await prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const formatted = invoices.map((inv) => ({
        ...inv,
        itemsSubtotalPaise: Number(inv.itemsSubtotalPaise),
        customizationTotalPaise: Number(inv.customizationTotalPaise),
        discountTotalPaise: Number(inv.discountTotalPaise),
        taxableAmountPaise: Number(inv.taxableAmountPaise),
        cgstPaise: Number(inv.cgstPaise),
        sgstPaise: Number(inv.sgstPaise),
        igstPaise: Number(inv.igstPaise),
        taxTotalPaise: Number(inv.taxTotalPaise),
        shippingTotalPaise: Number(inv.shippingTotalPaise),
        grandTotalPaise: Number(inv.grandTotalPaise),
      }));

      return NextResponse.json({ success: true, data: formatted });
    } catch {
      // Memory fallback
      const results: any[] = [];
      for (const inv of DEV_INVOICES_STORE.values()) {
        if (orderNumber && inv.orderNumber !== orderNumber) continue;
        if (financialYear && inv.financialYear !== financialYear) continue;
        results.push(inv);
      }
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return NextResponse.json({ success: true, data: results });
    }
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to list invoices.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/invoices
 * Issues or regenerates a GST Tax Invoice for an order.
 */
export async function POST(req: Request) {
  try {
    const user = await requireRole([Role.ADMIN, Role.STAFF], req);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { orderIdOrNumber, forceReissue } = body;
    if (!orderIdOrNumber || typeof orderIdOrNumber !== 'string') {
      return NextResponse.json({ error: 'orderIdOrNumber is required.' }, { status: 400 });
    }

    const invoice = await issueTaxInvoice(orderIdOrNumber, {
      forceReissue: Boolean(forceReissue),
      requestedBy: user.email,
    });

    return NextResponse.json({
      success: true,
      data: invoice,
      message: `Tax invoice ${invoice.invoiceNumber} successfully generated.`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof InvoiceValidationError || error instanceof SellerConfigError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to issue tax invoice.' },
      { status: 500 }
    );
  }
}
