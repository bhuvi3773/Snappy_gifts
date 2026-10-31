import { prisma } from '@/lib/prisma';
import { isStorefrontFallbackAllowed } from '@/lib/catalog/public-catalog.service';

export interface FinancialYearInfo {
  financialYear: string;      // e.g. "2026-27"
  shortFinancialYear: string; // e.g. "26-27"
  startYear: number;
  endYear: number;
}

// In-memory sequence fallback store for offline testing / development
// Key: `${financialYear}:${series}` -> number
export const DEV_INVOICE_SEQUENCE_STORE: Map<string, number> = new Map();

/**
 * Calculates Indian Financial Year according to Asia/Kolkata timezone with strict April 1 boundary.
 * Financial Year runs from April 1 00:00:00 to March 31 23:59:59 IST.
 */
export function getIndianFinancialYear(date: Date = new Date()): FinancialYearInfo {
  // Convert date to Asia/Kolkata timezone representation
  const kolkataDateStr = date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const [monthStr, dayStr, yearStr] = kolkataDateStr.split('/');
  const month = parseInt(monthStr, 10); // 1 to 12
  const year = parseInt(yearStr, 10);

  let startYear = year;
  let endYear = year + 1;

  if (month < 4) {
    // January, February, March belong to the ongoing financial year starting in the previous calendar year
    startYear = year - 1;
    endYear = year;
  }

  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(endYear).slice(-2);

  return {
    financialYear: `${startYear}-${String(endYear).slice(-2)}`, // "2026-27"
    shortFinancialYear: `${shortStart}-${shortEnd}`,             // "26-27"
    startYear,
    endYear,
  };
}

/**
 * Formats a compliant GST invoice number ensuring strict <= 16 character limit.
 * Format: `${series}/${shortFY}/${paddedSequence}` (e.g. "SG/26-27/0001")
 */
export function formatGstInvoiceNumber(
  series: string,
  shortFinancialYear: string,
  sequenceNumber: number
): string {
  const cleanSeries = series.trim().toUpperCase();
  const paddedSeq = String(sequenceNumber).padStart(4, '0');
  const invoiceNumber = `${cleanSeries}/${shortFinancialYear}/${paddedSeq}`;

  if (invoiceNumber.length > 16) {
    throw new Error(
      `Formatted invoice number "${invoiceNumber}" exceeds the mandatory 16-character GST limit (Rule 46(b)). Reduce series prefix length.`
    );
  }

  return invoiceNumber;
}

/**
 * Concurrency-safe, atomic sequence number allocator for a given financial year and series.
 * Increments and returns the next sequential integer.
 */
export async function getNextInvoiceSequence(
  financialYear: string,
  series = 'SG'
): Promise<number> {
  const cleanSeries = series.trim().toUpperCase();

  try {
    const seq = await prisma.$transaction(async (tx) => {
      const record = await tx.invoiceSequence.upsert({
        where: {
          financialYear_series: {
            financialYear,
            series: cleanSeries,
          },
        },
        create: {
          financialYear,
          series: cleanSeries,
          currentSequence: 1,
        },
        update: {
          currentSequence: { increment: 1 },
        },
      });

      return record.currentSequence;
    });

    return seq;
  } catch {
    if (process.env.NODE_ENV !== 'production' || isStorefrontFallbackAllowed()) {
      const storeKey = `${financialYear}:${cleanSeries}`;
      const current = DEV_INVOICE_SEQUENCE_STORE.get(storeKey) || 0;
      const next = current + 1;
      DEV_INVOICE_SEQUENCE_STORE.set(storeKey, next);
      return next;
    }

    throw new Error('Database transaction failed while allocating consecutive invoice sequence.');
  }
}

/**
 * Resets dev sequence store for unit and integration testing.
 */
export function _resetInvoiceSequencesForTesting(): void {
  DEV_INVOICE_SEQUENCE_STORE.clear();
}

