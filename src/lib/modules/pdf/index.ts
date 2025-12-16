/**
 * PDF Generation Module
 *
 * Provides PDF generation capabilities for invoices, reports, and documents
 * Uses PDFKit for server-side PDF generation (compatible with React 19)
 */

export interface PDFModuleConfig {
  templates?: Array<'invoice' | 'report' | 'receipt' | 'contract'>;
  engine?: 'pdfkit' | 'puppeteer';
}

export interface PDFModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const invoiceTemplate = `import PDFDocument from 'pdfkit';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  from: { name: string; address: string; email: string };
  to: { name: string; address: string; email: string };
  items: Array<{ description: string; quantity: number; price: number }>;
  tax?: number;
  notes?: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = data.tax || 0;
    const total = subtotal + tax;

    // Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(12);
    doc.text(\`Invoice #: \${data.invoiceNumber}\`);
    doc.text(\`Date: \${data.date}\`);
    doc.text(\`Due Date: \${data.dueDate}\`);
    doc.moveDown();

    // From
    doc.fontSize(10).text('From:', { underline: true });
    doc.fontSize(10);
    doc.text(data.from.name);
    doc.text(data.from.address);
    doc.text(data.from.email);
    doc.moveDown();

    // To
    doc.fontSize(10).text('To:', { underline: true });
    doc.fontSize(10);
    doc.text(data.to.name);
    doc.text(data.to.address);
    doc.text(data.to.email);
    doc.moveDown();

    // Items header
    doc.fontSize(10).text('Items:', { underline: true });
    doc.moveDown(0.5);

    // Items table
    const tableTop = doc.y;
    const descriptionX = 50;
    const quantityX = 300;
    const priceX = 380;
    const totalX = 480;

    doc.fontSize(10);
    doc.text('Description', descriptionX, tableTop);
    doc.text('Qty', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    doc.moveDown();

    // Draw line
    doc.moveTo(descriptionX, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Items
    data.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.description, descriptionX, y);
      doc.text(String(item.quantity), quantityX, y);
      doc.text(\`$\${item.price.toFixed(2)}\`, priceX, y);
      doc.text(\`$\${(item.quantity * item.price).toFixed(2)}\`, totalX, y);
      doc.moveDown();
    });

    doc.moveDown();
    doc.moveTo(descriptionX, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Totals
    const totalsX = 400;
    doc.text('Subtotal:', totalsX, doc.y);
    doc.text(\`$\${subtotal.toFixed(2)}\`, totalX, doc.y);
    doc.moveDown();

    if (tax > 0) {
      doc.text('Tax:', totalsX, doc.y);
      doc.text(\`$\${tax.toFixed(2)}\`, totalX, doc.y);
      doc.moveDown();
    }

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', totalsX, doc.y);
    doc.text(\`$\${total.toFixed(2)}\`, totalX, doc.y);
    doc.font('Helvetica');
    doc.moveDown();

    // Notes
    if (data.notes) {
      doc.moveDown();
      doc.fontSize(10).text('Notes:', { underline: true });
      doc.fontSize(10);
      doc.text(data.notes);
    }

    doc.end();
  });
}`;

const pdfApiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF } from '@/lib/pdf/invoice';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const pdfBuffer = await generateInvoicePDF(data);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="invoice-\${data.invoiceNumber}.pdf"\`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

// Usage example:
// POST /api/pdf/generate
// Body: { invoiceNumber: "INV-001", date: "2024-01-15", ... }`;

const pdfTypes = `// Type definitions for PDF generation
export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  from: { name: string; address: string; email: string };
  to: { name: string; address: string; email: string };
  items: Array<{ description: string; quantity: number; price: number }>;
  tax?: number;
  notes?: string;
}`;

export function generatePDFModule(config: PDFModuleConfig): PDFModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const dependencies = ['pdfkit', '@types/pdfkit'];
  const instructions: string[] = [
    'PDF generation uses PDFKit (server-side only)',
    'Use generateInvoicePDF() to create invoice PDFs',
    'Call POST /api/pdf/generate with invoice data to generate and download PDF',
    'PDFKit runs server-side - use in API routes, not client components',
  ];

  files.push(
    { path: 'lib/pdf/invoice.ts', content: invoiceTemplate },
    { path: 'app/api/pdf/generate/route.ts', content: pdfApiRoute },
    { path: 'lib/pdf/types.ts', content: pdfTypes }
  );

  return { files, envVars: [], dependencies, instructions };
}

export function getPDFModulePrompt(config: PDFModuleConfig): string {
  return `## PDF Generation Module\n\nTemplates: ${config.templates?.join(', ') || 'invoice'}\nEngine: ${config.engine || 'pdfkit'}\n\nIncludes server-side PDF generation for documents using PDFKit.`;
}
