import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateInvoicePDF(invoice: any, organization: any) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(35, 145, 205) // Primary color
  doc.text('INVOICE', 105, 20, { align: 'center' })
  
  // Organization details
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(organization.name, 14, 35)
  
  if (organization.abn) {
    doc.setFontSize(10)
    doc.text(`ABN: ${organization.abn}`, 14, 42)
  }
  
  if (organization.address) {
    doc.text(organization.address, 14, 48)
    if (organization.city || organization.state || organization.postcode) {
      doc.text(
        `${organization.city || ''} ${organization.state || ''} ${organization.postcode || ''}`.trim(),
        14,
        54
      )
    }
  }
  
  if (organization.phone) {
    doc.text(`Phone: ${organization.phone}`, 14, 60)
  }
  
  if (organization.email) {
    doc.text(`Email: ${organization.email}`, 14, 66)
  }
  
  // Invoice details box
  const statusColors: any = {
    draft: [128, 128, 128],
    sent: [255, 193, 7],
    paid: [76, 175, 80],
    overdue: [244, 67, 54],
    cancelled: [158, 158, 158],
  }
  
  doc.setFillColor(240, 240, 240)
  doc.rect(120, 35, 76, 46, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Number:', 124, 42)
  doc.text('Date:', 124, 50)
  doc.text('Due Date:', 124, 58)
  doc.text('Job:', 124, 66)
  doc.text('Status:', 124, 74)
  
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, 165, 42)
  doc.text(new Date(invoice.created_at).toLocaleDateString('en-AU'), 165, 50)
  doc.text(new Date(invoice.due_date).toLocaleDateString('en-AU'), 165, 58)
  doc.text(invoice.job?.job_number || 'N/A', 165, 66)
  
  const status = invoice.status.toUpperCase()
  const statusColor: [number, number, number] = statusColors[invoice.status] || [0, 0, 0]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.text(status, 165, 74)
  doc.setTextColor(0, 0, 0)
  
  // Customer details
  if (invoice.customer) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 90)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(invoice.customer.name, 14, 97)
    
    if (invoice.customer.email) {
      doc.text(invoice.customer.email, 14, 103)
    }
    
    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 14, 109)
    }
  }
  
  // Line items table
  const tableData = invoice.line_items?.map((item: any) => [
    item.description,
    item.quantity.toString(),
    `$${parseFloat(item.unit_price).toFixed(2)}`,
    `$${parseFloat(item.total).toFixed(2)}`,
  ]) || []
  
  autoTable(doc, {
    startY: 120,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [35, 145, 205],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  })
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(10)
  doc.text('Subtotal:', 140, finalY)
  doc.text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, 190, finalY, { align: 'right' })
  
  doc.text('GST (10%):', 140, finalY + 7)
  doc.text(`$${parseFloat(invoice.gst).toFixed(2)}`, 190, finalY + 7, { align: 'right' })
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total (AUD):', 140, finalY + 14)
  doc.text(`$${parseFloat(invoice.total).toFixed(2)}`, 190, finalY + 14, { align: 'right' })
  
  // Amount paid
  if (parseFloat(invoice.amount_paid) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Amount Paid:', 140, finalY + 21)
    doc.text(`$${parseFloat(invoice.amount_paid).toFixed(2)}`, 190, finalY + 21, { align: 'right' })
    
    const amountDue = parseFloat(invoice.total) - parseFloat(invoice.amount_paid)
    doc.setFont('helvetica', 'bold')
    doc.text('Amount Due:', 140, finalY + 28)
    doc.text(`$${amountDue.toFixed(2)}`, 190, finalY + 28, { align: 'right' })
  }
  
  // Notes
  if (invoice.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Notes:', 14, finalY + 40)
    const splitNotes = doc.splitTextToSize(invoice.notes, 180)
    doc.text(splitNotes, 14, finalY + 47)
  }
  
  // Payment information
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Payment Terms: Payment is due by the due date specified above.', 14, pageHeight - 30)
  
  if (invoice.status !== 'paid') {
    doc.text('Please make payment to:', 14, pageHeight - 24)
    doc.text('Bank: [Your Bank Details]', 14, pageHeight - 19)
    doc.text('Account: [Your Account Number]', 14, pageHeight - 14)
  }
  
  doc.text('Thank you for your business!', 105, pageHeight - 8, { align: 'center' })
  
  return doc
}
