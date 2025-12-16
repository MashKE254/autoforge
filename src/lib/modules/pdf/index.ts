/**
 * PDF Generation Module
 *
 * Provides PDF generation capabilities for invoices, reports, and documents
 */

export interface PDFModuleConfig {
  templates?: Array<'invoice' | 'report' | 'receipt' | 'contract'>;
  engine?: 'react-pdf' | 'puppeteer' | 'pdfkit';
}

export interface PDFModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const invoiceTemplate = `import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { fontSize: 24, marginBottom: 20 },
  section: { margin: 10, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 12, fontWeight: 'bold' },
  value: { fontSize: 12 },
  total: { fontSize: 16, fontWeight: 'bold', marginTop: 20 },
});

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

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = data.tax || 0;
  const total = subtotal + tax;

  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.header}>INVOICE</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice #:</Text>
            <Text style={styles.value}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{data.date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{data.dueDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>From:</Text>
          <Text style={styles.value}>{data.from.name}</Text>
          <Text style={styles.value}>{data.from.address}</Text>
          <Text style={styles.value}>{data.from.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.value}>{data.to.name}</Text>
          <Text style={styles.value}>{data.to.address}</Text>
          <Text style={styles.value}>{data.to.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Items:</Text>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.value}>{item.description}</Text>
              <Text style={styles.value}>{item.quantity} x \${item.price.toFixed(2)}</Text>
              <Text style={styles.value}>\${(item.quantity * item.price).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>\${subtotal.toFixed(2)}</Text>
          </View>
          {tax > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax:</Text>
              <Text style={styles.value}>\${tax.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.total}>Total:</Text>
            <Text style={styles.total}>\${total.toFixed(2)}</Text>
          </View>
        </View>

        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes:</Text>
            <Text style={styles.value}>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}`;

const pdfApiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/invoice';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const pdfBuffer = await renderToBuffer(<InvoicePDF data={data} />);

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
}`;

export function generatePDFModule(config: PDFModuleConfig): PDFModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const dependencies = ['@react-pdf/renderer'];
  const instructions: string[] = [
    'Use the InvoicePDF component to generate invoices',
    'Call POST /api/pdf/generate with invoice data to generate PDF',
  ];

  files.push(
    { path: 'components/pdf/invoice.tsx', content: invoiceTemplate },
    { path: 'app/api/pdf/generate/route.ts', content: pdfApiRoute }
  );

  return { files, envVars: [], dependencies, instructions };
}

export function getPDFModulePrompt(config: PDFModuleConfig): string {
  return \`## PDF Generation Module\n\nTemplates: \${config.templates?.join(', ') || 'invoice'}\nEngine: \${config.engine || 'react-pdf'}\n\nIncludes PDF generation for documents with customizable templates.\`;
}
