import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotePDFData {
  organization: any;
  quote: any;
  lineItems: any[];
  job: any;
  contact: any;
}

export interface InvoicePDFData {
  organization: any;
  invoice: any;
  lineItems: any[];
  job: any;
  contact: any;
}

export async function generateQuotePDF(data: QuotePDFData): Promise<Blob> {
  const { organization, quote, lineItems, job, contact } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Add logo if available
  if (organization?.logo_url) {
    try {
      // Note: In production, you'd need to fetch and convert the logo to base64
      // doc.addImage(logoBase64, 'PNG', 15, 10, 40, 20);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(organization?.brand_color || '#2563eb');
  doc.text('QUOTE', pageWidth - 15, 20, { align: 'right' });
  
  // Organization details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let yPos = 40;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(organization?.name || '', pageWidth - 15, yPos, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  if (organization?.abn) {
    doc.text(`ABN: ${organization.abn}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.address) {
    doc.text(organization.address, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.city || organization?.state || organization?.postcode) {
    doc.text(`${organization.city || ''} ${organization.state || ''} ${organization.postcode || ''}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.phone) {
    doc.text(`Ph: ${organization.phone}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.email) {
    doc.text(organization.email, pageWidth - 15, yPos, { align: 'right' });
  }
  
  // Quote details
  yPos = 40;
  doc.setFontSize(9);
  doc.text(`Quote #: ${quote.quote_number}`, 15, yPos);
  yPos += 5;
  doc.text(`Date: ${new Date(quote.quote_date).toLocaleDateString()}`, 15, yPos);
  yPos += 5;
  if (quote.valid_until) {
    doc.text(`Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}`, 15, yPos);
    yPos += 5;
  }
  
  // Bill To section
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(contact?.company_name || contact?.contact_name || '', 15, yPos);
  yPos += 4;
  if (contact?.contact_name && contact?.company_name) {
    doc.text(contact.contact_name, 15, yPos);
    yPos += 4;
  }
  if (contact?.address) {
    doc.text(contact.address, 15, yPos);
    yPos += 4;
  }
  if (contact?.city || contact?.state || contact?.postcode) {
    doc.text(`${contact.city || ''} ${contact.state || ''} ${contact.postcode || ''}`, 15, yPos);
    yPos += 4;
  }
  if (contact?.email) {
    doc.text(contact.email, 15, yPos);
    yPos += 4;
  }
  if (contact?.phone) {
    doc.text(contact.phone, 15, yPos);
    yPos += 4;
  }
  
  // Job Details
  if (job) {
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Details:', 15, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(job.title || '', 15, yPos);
    yPos += 4;
    if (job.description) {
      const descLines = doc.splitTextToSize(job.description, pageWidth - 30);
      doc.text(descLines, 15, yPos);
      yPos += descLines.length * 4;
    }
    if (job.site_address) {
      doc.text(`Site: ${job.site_address}${job.site_city ? ', ' + job.site_city : ''}${job.site_state ? ' ' + job.site_state : ''}${job.site_postcode ? ' ' + job.site_postcode : ''}`, 15, yPos);
      yPos += 4;
    }
  }
  
  // Line Items Table
  yPos += 10;
  const tableData = lineItems.map(item => [
    item.description || '',
    item.quantity?.toString() || '1',
    `$${parseFloat(item.unit_price || 0).toFixed(2)}`,
    `$${parseFloat(item.total || item.line_total || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: organization?.brand_color || '#2563eb',
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  yPos = finalY + 10;
  
  const totalsX = pageWidth - 70;
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`$${parseFloat(quote.subtotal || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 5;
  doc.text('GST (10%):', totalsX, yPos);
  doc.text(`$${parseFloat(quote.gst_amount || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, yPos);
  doc.text(`$${parseFloat(quote.total_amount || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Notes and Terms
  if (quote.notes || quote.terms) {
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 30);
      doc.text(notesLines, 15, yPos);
      yPos += notesLines.length * 4 + 5;
    }
    
    if (quote.terms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const termsLines = doc.splitTextToSize(quote.terms, pageWidth - 30);
      doc.text(termsLines, 15, yPos);
    }
  }
  
  return doc.output('blob');
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  const { organization, invoice, lineItems, job, contact } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(organization?.brand_color || '#2563eb');
  doc.text('INVOICE', pageWidth - 15, 20, { align: 'right' });
  
  // Organization details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let yPos = 40;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(organization?.name || '', pageWidth - 15, yPos, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  if (organization?.abn) {
    doc.text(`ABN: ${organization.abn}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.address) {
    doc.text(organization.address, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.city || organization?.state || organization?.postcode) {
    doc.text(`${organization.city || ''} ${organization.state || ''} ${organization.postcode || ''}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.phone) {
    doc.text(`Ph: ${organization.phone}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 4;
  }
  if (organization?.email) {
    doc.text(organization.email, pageWidth - 15, yPos, { align: 'right' });
  }
  
  // Invoice details
  yPos = 40;
  doc.setFontSize(9);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 15, yPos);
  yPos += 5;
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 15, yPos);
  yPos += 5;
  if (invoice.due_date) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
  }
  
  // Bill To section
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 15, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(contact?.company_name || contact?.contact_name || '', 15, yPos);
  yPos += 4;
  if (contact?.contact_name && contact?.company_name) {
    doc.text(contact.contact_name, 15, yPos);
    yPos += 4;
  }
  if (contact?.address) {
    doc.text(contact.address, 15, yPos);
    yPos += 4;
  }
  if (contact?.city || contact?.state || contact?.postcode) {
    doc.text(`${contact.city || ''} ${contact.state || ''} ${contact.postcode || ''}`, 15, yPos);
    yPos += 4;
  }
  if (contact?.email) {
    doc.text(contact.email, 15, yPos);
    yPos += 4;
  }
  if (contact?.phone) {
    doc.text(contact.phone, 15, yPos);
    yPos += 4;
  }
  
  // Job Details
  if (job) {
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Details:', 15, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(job.title || '', 15, yPos);
    yPos += 4;
    if (job.description) {
      const descLines = doc.splitTextToSize(job.description, pageWidth - 30);
      doc.text(descLines, 15, yPos);
      yPos += descLines.length * 4;
    }
    if (job.site_address) {
      doc.text(`Site: ${job.site_address}${job.site_city ? ', ' + job.site_city : ''}${job.site_state ? ' ' + job.site_state : ''}${job.site_postcode ? ' ' + job.site_postcode : ''}`, 15, yPos);
      yPos += 4;
    }
  }
  
  // Line Items Table
  yPos += 10;
  const tableData = lineItems.map(item => [
    item.description || '',
    item.quantity?.toString() || '1',
    `$${parseFloat(item.unit_price || 0).toFixed(2)}`,
    `$${parseFloat(item.total || item.line_total || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: organization?.brand_color || '#2563eb',
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  yPos = finalY + 10;
  
  const totalsX = pageWidth - 70;
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`$${parseFloat(invoice.subtotal || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 5;
  doc.text('GST (10%):', totalsX, yPos);
  doc.text(`$${parseFloat(invoice.gst_amount || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, yPos);
  doc.text(`$${parseFloat(invoice.total_amount || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Payment information
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount Paid: $${parseFloat(invoice.amount_paid || 0).toFixed(2)}`, totalsX, yPos);
  doc.text(`$${parseFloat(invoice.amount_paid || 0).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  yPos += 5;
  const balanceDue = parseFloat(invoice.total_amount || 0) - parseFloat(invoice.amount_paid || 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Balance Due:', totalsX, yPos);
  doc.text(`$${balanceDue.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Payment Details
  if (organization?.payment_details) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details:', 15, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const paymentLines = organization.payment_details.split('\n');
    paymentLines.forEach((line: string) => {
      doc.text(line, 15, yPos);
      yPos += 4;
    });
  }
  
  // Notes and Terms
  if (invoice.notes || invoice.terms) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (invoice.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
      doc.text(notesLines, 15, yPos);
      yPos += notesLines.length * 4 + 5;
    }
    
    if (invoice.terms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', 15, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 30);
      doc.text(termsLines, 15, yPos);
    }
  }
  
  return doc.output('blob');
}
