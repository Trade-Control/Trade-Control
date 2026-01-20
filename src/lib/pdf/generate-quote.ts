import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateQuotePDF(quote: any, organization: any) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(35, 145, 205) // Primary color
  doc.text('QUOTE', 105, 20, { align: 'center' })
  
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
  
  // Quote details box
  doc.setFillColor(240, 240, 240)
  doc.rect(120, 35, 76, 36, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Number:', 124, 42)
  doc.text('Date:', 124, 50)
  doc.text('Valid Until:', 124, 58)
  doc.text('Job:', 124, 66)
  
  doc.setFont('helvetica', 'normal')
  doc.text(quote.quote_number, 165, 42)
  doc.text(new Date(quote.created_at).toLocaleDateString('en-AU'), 165, 50)
  doc.text(new Date(quote.valid_until).toLocaleDateString('en-AU'), 165, 58)
  doc.text(quote.job?.job_number || 'N/A', 165, 66)
  
  // Customer details
  if (quote.customer) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 80)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(quote.customer.name, 14, 87)
    
    if (quote.customer.email) {
      doc.text(quote.customer.email, 14, 93)
    }
    
    if (quote.customer.phone) {
      doc.text(quote.customer.phone, 14, 99)
    }
  }
  
  // Line items table
  const tableData = quote.line_items?.map((item: any) => [
    item.description,
    item.quantity.toString(),
    `$${parseFloat(item.unit_price).toFixed(2)}`,
    `$${parseFloat(item.total).toFixed(2)}`,
  ]) || []
  
  autoTable(doc, {
    startY: 110,
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
  doc.text(`$${parseFloat(quote.subtotal).toFixed(2)}`, 190, finalY, { align: 'right' })
  
  doc.text('GST (10%):', 140, finalY + 7)
  doc.text(`$${parseFloat(quote.gst).toFixed(2)}`, 190, finalY + 7, { align: 'right' })
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total (AUD):', 140, finalY + 14)
  doc.text(`$${parseFloat(quote.total).toFixed(2)}`, 190, finalY + 14, { align: 'right' })
  
  // Notes
  if (quote.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Notes:', 14, finalY + 30)
    const splitNotes = doc.splitTextToSize(quote.notes, 180)
    doc.text(splitNotes, 14, finalY + 37)
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' })
  doc.text('This quote is valid until the date specified above.', 105, pageHeight - 15, { align: 'center' })
  
  return doc
}
