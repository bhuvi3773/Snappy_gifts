import { NextResponse } from 'next/server';
import {
  isWoodenCrateSurchargeApproved,
  getWoodenCrateSurchargePaise,
} from '@/lib/pricing/pricing.service';

/**
 * Public configuration endpoint for personalization options and surcharge availability.
 * Provides the client UI with authoritative server-computed option availability,
 * eliminating any disagreement between frontend and backend environment variables.
 * Never exposes server credentials or environment secrets.
 */
export async function GET() {
  const isApproved = isWoodenCrateSurchargeApproved();
  const surchargePaise = getWoodenCrateSurchargePaise();

  return NextResponse.json({
    success: true,
    data: {
      packaging: {
        woodenCrate: {
          approved: isApproved,
          available: isApproved,
          surchargePaise: isApproved ? surchargePaise : 0,
          surchargeInr: isApproved ? Math.round(surchargePaise / 100) : 0,
          label: 'Vintage Wooden Keepsake Crate',
          description: isApproved
            ? `Laser-carved solid Sheesham wood crate (+₹${Math.round(surchargePaise / 100)})`
            : 'Vintage Wooden Keepsake Crate (Pending Owner Approval)',
        },
      },
      typography: {
        supportedFonts: [
          'Dancing Script',
          'Playfair Display',
          'Cormorant Garamond',
          'Great Vibes',
          'Plus Jakarta Sans',
          'Alex Brush',
        ],
      },
      limits: {
        maxEngravedTextLength: 32,
        maxGiftNoteLength: 200,
        maxArtworkSizeBytes: 5 * 1024 * 1024,
        allowedArtworkMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
    },
  });
}
