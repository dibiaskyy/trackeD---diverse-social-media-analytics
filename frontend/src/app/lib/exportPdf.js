import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportAnalyticsToPdf(posts, metrics) {
  if (!posts || posts.length === 0) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Header Banner
  doc.setFillColor(9, 9, 11) // #09090b
  doc.rect(0, 0, 210, 24, 'F')

  // Logo & Title
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('trackeD', 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(161, 161, 170)
  doc.text('Social Media Performance & Analytics Report', 45, 15)

  doc.setFontSize(8)
  doc.text(`Generated: ${dateStr}`, 145, 15)

  // Executive Summary Section
  doc.setTextColor(9, 9, 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Executive Performance Summary', 14, 34)

  // Summary Stat Cards Box
  const stats = [
    { label: 'Total Reach (Views)', val: metrics.totalViews.toLocaleString() },
    { label: 'Total Interactions', val: metrics.totalInteractions.toLocaleString() },
    { label: 'Avg Engagement Rate', val: `${metrics.avgEngagementRate}%` },
    { label: 'Tracked Posts', val: `${posts.length} Posts` },
  ]

  const cardWidth = 43
  const cardHeight = 18
  const startY = 38

  stats.forEach((st, i) => {
    const x = 14 + i * (cardWidth + 3)
    doc.setFillColor(244, 244, 246)
    doc.setDrawColor(228, 228, 231)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(113, 113, 122)
    doc.text(st.label, x + 3, startY + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(9, 9, 11)
    doc.text(st.val, x + 3, startY + 14)
  })

  // Platform Breakdown Table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(9, 9, 11)
  doc.text('Platform Share & Interaction Breakdown', 14, 66)

  const platformRows = [
    ['TikTok', `${metrics.tiktokStats.count} posts`, metrics.tiktokStats.views.toLocaleString(), metrics.tiktokStats.likes.toLocaleString(), metrics.tiktokStats.comments.toLocaleString(), metrics.tiktokStats.shares.toLocaleString(), `${metrics.tiktokStats.eng}%`],
    ['YouTube', `${metrics.youtubeStats.count} posts`, metrics.youtubeStats.views.toLocaleString(), metrics.youtubeStats.likes.toLocaleString(), metrics.youtubeStats.comments.toLocaleString(), 'N/A (Hidden)', `${metrics.youtubeStats.eng}%`],
    ['Facebook', `${metrics.facebookStats.count} posts`, metrics.facebookStats.views.toLocaleString(), metrics.facebookStats.likes.toLocaleString(), metrics.facebookStats.comments.toLocaleString(), metrics.facebookStats.shares.toLocaleString(), `${metrics.facebookStats.eng}%`],
  ]

  autoTable(doc, {
    startY: 70,
    head: [['Platform', 'Posts', 'Views', 'Likes', 'Comments', 'Shares', 'ERR %']],
    body: platformRows,
    theme: 'grid',
    headStyles: {
      fillColor: [9, 9, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [24, 24, 27],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    styles: {
      cellPadding: 2.5,
      lineColor: [228, 228, 231],
      lineWidth: 0.2,
    },
  })

  // Top Content Leaderboard Table
  const nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 110) + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(9, 9, 11)
  doc.text('Top Performing Tracked Content', 14, nextY)

  const contentRows = metrics.leaderboard.map((p, idx) => [
    `#${idx + 1}`,
    p.platform.toUpperCase(),
    p.caption ? (p.caption.length > 40 ? p.caption.substring(0, 38) + '...' : p.caption) : 'No caption',
    (p.latest?.views ?? 0).toLocaleString(),
    (p.latest?.likes ?? 0).toLocaleString(),
    (p.latest?.comments ?? 0).toLocaleString(),
    (p.latest?.shares ?? 0).toLocaleString(),
  ])

  autoTable(doc, {
    startY: nextY + 4,
    head: [['#', 'Platform', 'Video Title / Caption', 'Views', 'Likes', 'Comments', 'Shares']],
    body: contentRows,
    theme: 'grid',
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [24, 24, 27],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    styles: {
      cellPadding: 2.5,
      lineColor: [228, 228, 231],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 65 },
      3: { cellWidth: 22, fontStyle: 'bold' },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
    },
  })

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(161, 161, 170)
    doc.text(
      `trackeD Analytics Report · Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    )
  }

  // Save the PDF
  const filename = `trackeD_Report_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
