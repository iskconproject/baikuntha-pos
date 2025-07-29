import { format } from 'date-fns';

// CSV Export functionality
export class CSVExporter {
  /**
   * Convert array of objects to CSV string
   */
  static arrayToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Download CSV file
   */
  static downloadCSV(data: any[], filename: string): void {
    const csv = this.arrayToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// PDF Export functionality (using browser's print functionality)
export class PDFExporter {
  /**
   * Generate HTML table from data
   */
  static generateHTMLTable(data: any[], title: string): string {
    if (!data || data.length === 0) {
      return `<h2>${title}</h2><p>No data available</p>`;
    }

    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    
    const dataRows = data.map(row => {
      const cells = headers.map(header => `<td>${row[header] ?? ''}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div style="font-family: Arial, sans-serif; margin: 20px;">
        <h2 style="color: #d97706; margin-bottom: 20px;">${title}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              ${headerRow}
            </tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
        <p style="font-size: 12px; color: #6b7280;">
          Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} - VaikunthaPOS
        </p>
      </div>
      <style>
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          font-weight: bold;
          background-color: #f9fafb;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    `;
  }

  /**
   * Open print dialog with formatted data
   */
  static printReport(data: any[], title: string): void {
    const htmlContent = this.generateHTMLTable(data, title);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  /**
   * Generate PDF blob (for future implementation with a PDF library)
   */
  static async generatePDFBlob(data: any[], title: string): Promise<Blob> {
    // For now, we'll use the browser's print-to-PDF functionality
    // In a future implementation, we could use libraries like jsPDF or Puppeteer
    const htmlContent = this.generateHTMLTable(data, title);
    return new Blob([htmlContent], { type: 'text/html' });
  }
}

// Report export service that combines both CSV and PDF functionality
export class ReportExportService {
  /**
   * Export data as CSV
   */
  static exportAsCSV(data: any[], filename: string): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fullFilename = `${filename}_${timestamp}.csv`;
    CSVExporter.downloadCSV(data, fullFilename);
  }

  /**
   * Export data as PDF (print)
   */
  static exportAsPDF(data: any[], title: string): void {
    PDFExporter.printReport(data, title);
  }

  /**
   * Generate filename based on report type and date range
   */
  static generateFilename(
    reportType: string,
    startDate?: Date,
    endDate?: Date
  ): string {
    let filename = `${reportType}_report`;
    
    if (startDate && endDate) {
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');
      filename += `_${start}_to_${end}`;
    } else if (startDate) {
      const date = format(startDate, 'yyyy-MM-dd');
      filename += `_${date}`;
    }
    
    return filename;
  }

  /**
   * Format currency values for export
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format data for better readability in exports
   */
  static formatExportData(data: any[], reportType: string): any[] {
    return data.map(item => {
      const formatted = { ...item };
      
      // Format currency fields
      Object.keys(formatted).forEach(key => {
        if (key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('total') || 
            key.toLowerCase().includes('revenue') ||
            key.toLowerCase().includes('sales') ||
            key.toLowerCase().includes('subtotal') ||
            key.toLowerCase().includes('tax') ||
            key.toLowerCase().includes('discount')) {
          if (typeof formatted[key] === 'number') {
            formatted[key] = this.formatCurrency(formatted[key]);
          }
        }
      });
      
      return formatted;
    });
  }
}

// Exports are already done above with class declarations