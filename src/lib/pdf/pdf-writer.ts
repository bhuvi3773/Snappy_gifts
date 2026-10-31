/**
 * Pure TypeScript PDF Writer (ISO 32000-1 / PDF 1.4 Compliant)
 * Zero external dependencies. Fast, deterministic, memory-safe.
 */

export interface RGBColor {
  r: number; // 0 to 1
  g: number; // 0 to 1
  b: number; // 0 to 1
}

export const COLORS = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 1, g: 1, b: 1 },
  charcoal: { r: 0.15, g: 0.15, b: 0.18 },
  slateDark: { r: 0.25, g: 0.28, b: 0.32 },
  slateLight: { r: 0.55, g: 0.58, b: 0.62 },
  borderGray: { r: 0.85, g: 0.86, b: 0.88 },
  bgLight: { r: 0.97, g: 0.97, b: 0.98 },
  bgHeader: { r: 0.93, g: 0.94, b: 0.96 },
  rosePrimary: { r: 0.60, g: 0.12, b: 0.20 },
  roseLight: { r: 0.98, g: 0.92, b: 0.94 },
  amberWarning: { r: 0.85, g: 0.45, b: 0.10 },
  sampleRed: { r: 0.85, g: 0.15, b: 0.15 },
};

export type StandardFont = 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Courier';

interface TextOptions {
  font?: StandardFont;
  size?: number;
  color?: RGBColor;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

interface RectOptions {
  fill?: RGBColor;
  stroke?: RGBColor;
  lineWidth?: number;
}

interface LineOptions {
  stroke?: RGBColor;
  lineWidth?: number;
  dashed?: boolean;
}

export class PdfPage {
  public width = 595.28; // Standard A4 width in points (8.27 in * 72 pt/in)
  public height = 841.89; // Standard A4 height in points (11.69 in * 72 pt/in)
  public commands: string[] = [];

  // Helper to convert top-down Y coordinate to bottom-up PDF coordinate
  private toPdfY(yFromTop: number): number {
    return this.height - yFromTop;
  }

  // Escape special PDF string characters: \ ( )
  private escapeString(text: string): string {
    if (!text && text !== '0') return '';
    const normalized = String(text)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/₹/g, 'Rs. ')
      .replace(/•/g, '- ')
      .replace(/[–—]/g, '-')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, '...')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    const asciiOnly = normalized.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
    return asciiOnly.trim() === '' && String(text).trim() !== '' ? '[Details]' : asciiOnly;
  }

  rect(x: number, yFromTop: number, width: number, height: number, options: RectOptions = {}): this {
    const pdfY = this.toPdfY(yFromTop + height);
    this.commands.push('q');
    const lineWidth = options.lineWidth || 1;
    this.commands.push(`${lineWidth.toFixed(2)} w`);

    if (options.fill) {
      this.commands.push(`${options.fill.r.toFixed(3)} ${options.fill.g.toFixed(3)} ${options.fill.b.toFixed(3)} rg`);
    }
    if (options.stroke) {
      this.commands.push(`${options.stroke.r.toFixed(3)} ${options.stroke.g.toFixed(3)} ${options.stroke.b.toFixed(3)} RG`);
    }

    this.commands.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`);

    if (options.fill && options.stroke) {
      this.commands.push('B'); // Fill and stroke
    } else if (options.fill) {
      this.commands.push('f'); // Fill only
    } else if (options.stroke) {
      this.commands.push('S'); // Stroke only
    }
    this.commands.push('Q');
    return this;
  }

  line(x1: number, y1FromTop: number, x2: number, y2FromTop: number, options: LineOptions = {}): this {
    const pdfY1 = this.toPdfY(y1FromTop);
    const pdfY2 = this.toPdfY(y2FromTop);
    this.commands.push('q');
    const lineWidth = options.lineWidth || 1;
    this.commands.push(`${lineWidth.toFixed(2)} w`);

    if (options.stroke) {
      this.commands.push(`${options.stroke.r.toFixed(3)} ${options.stroke.g.toFixed(3)} ${options.stroke.b.toFixed(3)} RG`);
    }
    if (options.dashed) {
      this.commands.push('[3 3] 0 d');
    }

    this.commands.push(`${x1.toFixed(2)} ${pdfY1.toFixed(2)} m`);
    this.commands.push(`${x2.toFixed(2)} ${pdfY2.toFixed(2)} l`);
    this.commands.push('S');
    this.commands.push('Q');
    return this;
  }

  text(textStr: string, x: number, yFromTop: number, options: TextOptions = {}): this {
    if (!textStr && textStr !== '0') return this;
    const font = options.font || 'Helvetica';
    const size = options.size || 10;
    const color = options.color || COLORS.black;
    const align = options.align || 'left';
    const escaped = this.escapeString(String(textStr));

    // Approximate character width factor for standard Helvetica
    const charWidth = size * 0.52;
    const textWidth = escaped.length * charWidth;

    let adjustedX = x;
    if (align === 'right') {
      adjustedX = x - textWidth;
    } else if (align === 'center') {
      adjustedX = x - (textWidth / 2);
    }

    const pdfY = this.toPdfY(yFromTop);

    this.commands.push('BT');
    this.commands.push(`/${font} ${size.toFixed(2)} Tf`);
    this.commands.push(`${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`);
    this.commands.push(`${adjustedX.toFixed(2)} ${pdfY.toFixed(2)} Td`);
    this.commands.push(`(${escaped}) Tj`);
    this.commands.push('ET');
    return this;
  }

  // --- Native PDF Coordinate API (y: 0 = bottom, 842 = top of A4) ---

  private normalizeColor(color?: [number, number, number] | RGBColor): RGBColor {
    if (!color) return COLORS.black;
    if (Array.isArray(color)) {
      return { r: color[0], g: color[1], b: color[2] };
    }
    return color;
  }

  drawText(
    textStr: string,
    x: number,
    y: number,
    options: {
      size?: number;
      font?: StandardFont;
      color?: [number, number, number] | RGBColor;
      align?: 'left' | 'center' | 'right';
    } = {}
  ): this {
    if (!textStr && textStr !== '0') return this;
    const font = options.font || 'Helvetica';
    const size = options.size || 10;
    const c = this.normalizeColor(options.color);
    const align = options.align || 'left';
    const escaped = this.escapeString(String(textStr));

    const charWidth = size * 0.52;
    const textWidth = escaped.length * charWidth;

    let adjustedX = x;
    if (align === 'right') {
      adjustedX = x - textWidth;
    } else if (align === 'center') {
      adjustedX = x - textWidth / 2;
    }

    this.commands.push('BT');
    this.commands.push(`/${font} ${size.toFixed(2)} Tf`);
    this.commands.push(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg`);
    this.commands.push(`${adjustedX.toFixed(2)} ${y.toFixed(2)} Td`);
    this.commands.push(`(${escaped}) Tj`);
    this.commands.push('ET');
    return this;
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fillColor?: [number, number, number] | RGBColor;
      strokeColor?: [number, number, number] | RGBColor;
      lineWidth?: number;
    } = {}
  ): this {
    this.commands.push('q');
    const lineWidth = options.lineWidth || 1;
    this.commands.push(`${lineWidth.toFixed(2)} w`);

    if (options.fillColor) {
      const fc = this.normalizeColor(options.fillColor);
      this.commands.push(`${fc.r.toFixed(3)} ${fc.g.toFixed(3)} ${fc.b.toFixed(3)} rg`);
    }
    if (options.strokeColor) {
      const sc = this.normalizeColor(options.strokeColor);
      this.commands.push(`${sc.r.toFixed(3)} ${sc.g.toFixed(3)} ${sc.b.toFixed(3)} RG`);
    }

    this.commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`);

    if (options.fillColor && options.strokeColor) {
      this.commands.push('B');
    } else if (options.fillColor) {
      this.commands.push('f');
    } else if (options.strokeColor) {
      this.commands.push('S');
    }
    this.commands.push('Q');
    return this;
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      color?: [number, number, number] | RGBColor;
      lineWidth?: number;
      dashed?: boolean;
    } = {}
  ): this {
    this.commands.push('q');
    const lineWidth = options.lineWidth || 1;
    this.commands.push(`${lineWidth.toFixed(2)} w`);

    if (options.color) {
      const c = this.normalizeColor(options.color);
      this.commands.push(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG`);
    }
    if (options.dashed) {
      this.commands.push('[3 3] 0 d');
    }

    this.commands.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`);
    this.commands.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`);
    this.commands.push('S');
    this.commands.push('Q');
    return this;
  }
}

export class PdfDocument {
  public pages: PdfPage[] = [];

  addPage(): PdfPage {
    const page = new PdfPage();
    this.pages.push(page);
    return page;
  }

  write(): Buffer {
    return this.build();
  }

  build(): Buffer {
    if (this.pages.length === 0) {
      this.addPage();
    }

    const chunks: Buffer[] = [];
    let currentOffset = 0;
    const offsets: number[] = [];

    const write = (str: string) => {
      const buf = Buffer.from(str, 'latin1');
      chunks.push(buf);
      currentOffset += buf.length;
    };

    // 1. PDF Header
    write('%PDF-1.4\n');
    write('%\xe2\xe3\xcf\xd3\n'); // Binary marker for PDF-1.4

    // Object 1: Catalog
    offsets[1] = currentOffset;
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Object 2: Pages root
    const pageCount = this.pages.length;
    // Page objects start at object ID 7: 7, 9, 11, ...
    const kids = Array.from({ length: pageCount }, (_, i) => `${7 + i * 2} 0 R`).join(' ');
    offsets[2] = currentOffset;
    write(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`);

    // Fonts: Helvetica & Courier (Objects: 3, 4, 5, 6)
    const fontObjects = [
      { id: 3, name: 'Helvetica', base: 'Helvetica' },
      { id: 4, name: 'Helvetica-Bold', base: 'Helvetica-Bold' },
      { id: 5, name: 'Helvetica-Oblique', base: 'Helvetica-Oblique' },
      { id: 6, name: 'Courier', base: 'Courier' },
    ];

    for (const f of fontObjects) {
      offsets[f.id] = currentOffset;
      write(`${f.id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${f.base} /Encoding /WinAnsiEncoding >>\nendobj\n`);
    }

    const fontRes = `<< /Helvetica 3 0 R /Helvetica-Bold 4 0 R /Helvetica-Oblique 5 0 R /Courier 6 0 R >>`;

    // Pages & Content Streams: from Object 7 onwards
    for (let i = 0; i < pageCount; i++) {
      const page = this.pages[i];
      const pageObjId = 7 + i * 2;
      const contentObjId = pageObjId + 1;

      // Page Object
      offsets[pageObjId] = currentOffset;
      write(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font ${fontRes} >> /Contents ${contentObjId} 0 R >>\nendobj\n`
      );

      // Content Stream Object
      const streamBody = page.commands.join('\n') + '\n';
      const streamBuf = Buffer.from(streamBody, 'latin1');
      offsets[contentObjId] = currentOffset;
      write(`${contentObjId} 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`);
      chunks.push(streamBuf);
      currentOffset += streamBuf.length;
      write('endstream\nendobj\n');
    }

    // XRef Table
    const startXref = currentOffset;
    const maxObj = 7 + pageCount * 2;
    write(`xref\n0 ${maxObj}\n`);
    write('0000000000 65535 f \n');

    for (let i = 1; i < maxObj; i++) {
      if (offsets[i] !== undefined) {
        write(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
      } else {
        write('0000000000 65535 f \n');
      }
    }

    // Trailer
    write(`trailer\n<< /Size ${maxObj} /Root 1 0 R >>\n`);
    write(`startxref\n${startXref}\n%%EOF\n`);

    return Buffer.concat(chunks);
  }
}
