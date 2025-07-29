import type { ReceiptData, ReceiptTemplate } from '@/types/receipt';

export class ReceiptGenerator {
  /**
   * Generate thermal receipt text
   */
  static generateThermalReceipt(
    receiptData: ReceiptData,
    template?: ReceiptTemplate
  ): string {
    const width = 32; // Standard thermal printer width
    const lines: string[] = [];

    // Header
    lines.push(this.centerText(receiptData.storeName, width));
    lines.push(this.centerText('='.repeat(width), width));
    lines.push('');

    // Store info
    lines.push(this.wrapText(receiptData.storeAddress, width));
    if (receiptData.storePhone) {
      lines.push(`Phone: ${receiptData.storePhone}`);
    }
    if (receiptData.storeEmail) {
      lines.push(`Email: ${receiptData.storeEmail}`);
    }
    lines.push('');

    // Receipt info
    lines.push(`Receipt: ${receiptData.receiptNumber}`);
    lines.push(`Date: ${receiptData.timestamp.toLocaleString()}`);
    lines.push(`Cashier: ${receiptData.cashier.username}`);
    lines.push('-'.repeat(width));

    // Items
    lines.push('ITEMS:');
    receiptData.items.forEach(item => {
      const itemName = item.variant 
        ? `${item.name} - ${item.variant}`
        : item.name;
      
      lines.push(this.wrapText(itemName, width));
      
      const qtyPrice = `${item.quantity} x ₹${item.unitPrice.toFixed(2)}`;
      const total = `₹${item.totalPrice.toFixed(2)}`;
      const spacesNeeded = width - qtyPrice.length - total.length;
      
      lines.push(`${qtyPrice}${' '.repeat(Math.max(1, spacesNeeded))}${total}`);
    });

    lines.push('-'.repeat(width));

    // Totals
    lines.push(this.formatLine('Subtotal:', `₹${receiptData.subtotal.toFixed(2)}`, width));
    
    if (receiptData.tax > 0) {
      lines.push(this.formatLine('Tax:', `₹${receiptData.tax.toFixed(2)}`, width));
    }
    
    if (receiptData.discount > 0) {
      lines.push(this.formatLine('Discount:', `-₹${receiptData.discount.toFixed(2)}`, width));
    }
    
    lines.push('='.repeat(width));
    lines.push(this.formatLine('TOTAL:', `₹${receiptData.total.toFixed(2)}`, width));
    lines.push('='.repeat(width));

    // Payment info
    lines.push('');
    lines.push(`Payment: ${receiptData.paymentMethod.toUpperCase()}`);
    
    if (receiptData.paymentReference) {
      lines.push(`Ref: ${receiptData.paymentReference}`);
    }
    
    if (receiptData.cashReceived) {
      lines.push(this.formatLine('Cash Received:', `₹${receiptData.cashReceived.toFixed(2)}`, width));
    }
    
    if (receiptData.changeGiven && receiptData.changeGiven > 0) {
      lines.push(this.formatLine('Change:', `₹${receiptData.changeGiven.toFixed(2)}`, width));
    }

    // Footer
    lines.push('');
    lines.push(this.centerText(receiptData.footer, width));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate HTML receipt for PDF/web display
   */
  static generateHTMLReceipt(receiptData: ReceiptData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${receiptData.receiptNumber}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 0 auto;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .store-info {
            font-size: 10px;
            margin-bottom: 15px;
        }
        .receipt-info {
            margin-bottom: 15px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
        }
        .items {
            margin-bottom: 15px;
        }
        .item {
            margin-bottom: 8px;
        }
        .item-name {
            font-weight: bold;
        }
        .item-details {
            display: flex;
            justify-content: space-between;
        }
        .totals {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-bottom: 15px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        .grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin: 10px 0;
        }
        .payment-info {
            margin-bottom: 20px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
        }
        .footer {
            text-align: center;
            font-size: 10px;
            white-space: pre-line;
        }
        @media print {
            body { margin: 0; padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="store-name">${receiptData.storeName}</div>
        <div class="store-info">
            ${receiptData.storeAddress}<br>
            ${receiptData.storePhone ? `Phone: ${receiptData.storePhone}<br>` : ''}
            ${receiptData.storeEmail ? `Email: ${receiptData.storeEmail}` : ''}
        </div>
    </div>

    <div class="receipt-info">
        <div>Receipt: ${receiptData.receiptNumber}</div>
        <div>Date: ${receiptData.timestamp.toLocaleString()}</div>
        <div>Cashier: ${receiptData.cashier.username}</div>
    </div>

    <div class="items">
        <div style="font-weight: bold; margin-bottom: 10px;">ITEMS:</div>
        ${receiptData.items.map(item => `
            <div class="item">
                <div class="item-name">
                    ${item.name}${item.variant ? ` - ${item.variant}` : ''}
                </div>
                <div class="item-details">
                    <span>${item.quantity} x ₹${item.unitPrice.toFixed(2)}</span>
                    <span>₹${item.totalPrice.toFixed(2)}</span>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>₹${receiptData.subtotal.toFixed(2)}</span>
        </div>
        ${receiptData.tax > 0 ? `
            <div class="total-line">
                <span>Tax:</span>
                <span>₹${receiptData.tax.toFixed(2)}</span>
            </div>
        ` : ''}
        ${receiptData.discount > 0 ? `
            <div class="total-line">
                <span>Discount:</span>
                <span>-₹${receiptData.discount.toFixed(2)}</span>
            </div>
        ` : ''}
        <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>₹${receiptData.total.toFixed(2)}</span>
        </div>
    </div>

    <div class="payment-info">
        <div>Payment: ${receiptData.paymentMethod.toUpperCase()}</div>
        ${receiptData.paymentReference ? `<div>Ref: ${receiptData.paymentReference}</div>` : ''}
        ${receiptData.cashReceived ? `
            <div class="total-line">
                <span>Cash Received:</span>
                <span>₹${receiptData.cashReceived.toFixed(2)}</span>
            </div>
        ` : ''}
        ${receiptData.changeGiven && receiptData.changeGiven > 0 ? `
            <div class="total-line">
                <span>Change:</span>
                <span>₹${receiptData.changeGiven.toFixed(2)}</span>
            </div>
        ` : ''}
    </div>

    <div class="footer">
        ${receiptData.footer}
    </div>
</body>
</html>`;
  }

  /**
   * Helper methods
   */
  private static centerText(text: string, width: number): string {
    if (text.length >= width) return text;
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private static formatLine(label: string, value: string, width: number): string {
    const spacesNeeded = width - label.length - value.length;
    return `${label}${' '.repeat(Math.max(1, spacesNeeded))}${value}`;
  }

  private static wrapText(text: string, width: number): string {
    if (text.length <= width) return text;
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= width) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }
}