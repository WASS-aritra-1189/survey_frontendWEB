import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { downloadHistoryService, DownloadFormat } from "@/services/downloadHistoryService";
import { useAuthStore } from "@/store/authStore";

const getToken = () => useAuthStore.getState().tokens?.accessToken ?? null;

const track = (format: DownloadFormat, fileName: string, source: string, recordCount = 0) => {
  const token = getToken();
  if (token) downloadHistoryService.record(token, { format, fileName, source, recordCount });
};

export const exportToCSV = (data: any[], filename: string, headers: string[], source = 'Reports') => {
  try {
    const escape = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = data.map(row => headers.map(h => escape(row[h])));
    const csv = [headers.map(escape), ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    track('CSV', `${filename}_${Date.now()}.csv`, source, data.length);
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('CSV export error:', error);
    toast.error('Failed to export CSV');
  }
};

export const exportToPDF = (content: string, filename: string, source = 'Reports') => {
  try {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);
    doc.save(`${filename}_${Date.now()}.pdf`);
    track('PDF', `${filename}_${Date.now()}.pdf`, source);
    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to export PDF');
  }
};

export const exportToExcel = (sheets: { name: string; headers: string[]; rows: any[][] }[], filename: string, source = 'Reports') => {
  try {
    // Build SpreadsheetML XML (opens natively in Excel)
    const xmlRows = (headers: string[], rows: any[][]) => [
      `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>`,
      ...rows.map(r =>
        `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`
      ),
    ].join('');

    const worksheets = sheets.map(s =>
      `<Worksheet ss:Name="${s.name}"><Table>${xmlRows(s.headers, s.rows)}</Table></Worksheet>`
    ).join('');

    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    track('EXCEL', `${filename}_${Date.now()}.xls`, source, sheets.reduce((s, sh) => s + sh.rows.length, 0));
    toast.success('Excel file downloaded successfully');
  } catch (error) {
    console.error('Excel export error:', error);
    toast.error('Failed to export Excel');
  }
};

export const exportToJSON = (data: any, filename: string, source = 'Reports') => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    track('JSON', `${filename}_${Date.now()}.json`, source);
    toast.success('JSON downloaded successfully');
  } catch (error) {
    console.error('JSON export error:', error);
    toast.error('Failed to export JSON');
  }
};

export const exportReportToPDF = (
  title: string,
  sections: { heading: string; rows: string[][] }[],
  filename: string,
  source = 'Reports',
) => {
  try {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 10;

    for (const section of sections) {
      if (y > 260) { doc.addPage(); y = 18; }

      // Section heading
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, 10, y);
      y += 6;

      // Table header
      if (section.rows.length > 0) {
        const colW = (pageW - 20) / section.rows[0].length;
        doc.setFontSize(9);
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 4, pageW - 20, 7, 'F');
        doc.setFont('helvetica', 'bold');
        section.rows[0].forEach((cell, ci) => doc.text(String(cell), 11 + ci * colW, y));
        y += 7;

        // Data rows
        doc.setFont('helvetica', 'normal');
        for (let ri = 1; ri < section.rows.length; ri++) {
          if (y > 270) { doc.addPage(); y = 18; }
          if (ri % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(10, y - 4, pageW - 20, 7, 'F');
          }
          section.rows[ri].forEach((cell, ci) => {
            const txt = doc.splitTextToSize(String(cell ?? ''), colW - 2);
            doc.text(txt[0], 11 + ci * colW, y);
          });
          y += 7;
        }
      }
      y += 6;
    }

    doc.save(`${filename}_${Date.now()}.pdf`);
    track('PDF', `${filename}_${Date.now()}.pdf`, source, sections.reduce((s, sec) => s + Math.max(0, sec.rows.length - 1), 0));
    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to export PDF');
  }
};

export const exportResponsesToCSV = (responses: any[]) => {
  try {
    const headers = ['Response ID', 'Respondent Name', 'Contact', 'Submitted', 'Question ID', 'Answer'];
    const flatData = responses.flatMap(r => 
      r.responses.map((a: any) => ({
        'Response ID': r.id,
        'Respondent Name': r.respondentName,
        'Contact': r.respondentContact,
        'Submitted': new Date(r.createdAt).toLocaleString(),
        'Question ID': a.questionId,
        'Answer': a.answer
      }))
    );
    exportToCSV(flatData, 'responses', headers);
  } catch (error) {
    console.error('Response CSV export error:', error);
    toast.error('Failed to export responses to CSV');
  }
};

export const exportResponsesToPDF = (responses: any[]) => {
  try {
    const doc = new jsPDF();
    let yPos = 20;
    
    responses.forEach((r, idx) => {
      if (idx > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(16);
      doc.text('Survey Response', 10, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.text(`Respondent: ${r.respondentName}`, 10, yPos);
      yPos += 7;
      doc.text(`Contact: ${r.respondentContact}`, 10, yPos);
      yPos += 7;
      doc.text(`Submitted: ${new Date(r.createdAt).toLocaleString()}`, 10, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.text('Answers:', 10, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      r.responses.forEach((a: any, i: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${i + 1}. Question ID: ${a.questionId}`, 10, yPos);
        yPos += 5;
        const answerLines = doc.splitTextToSize(`   Answer: ${a.answer}`, 180);
        doc.text(answerLines, 10, yPos);
        yPos += answerLines.length * 5 + 3;
      });
    });
    
    doc.save(`responses_${Date.now()}.pdf`);
    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('Response PDF export error:', error);
    toast.error('Failed to export responses to PDF');
  }
};
