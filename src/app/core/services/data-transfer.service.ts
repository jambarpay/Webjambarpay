import { Injectable } from '@angular/core';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export type ImportedRecord = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class DataTransferService {
  async readRecords(file: File): Promise<ImportedRecord[]> {
    const text = await file.text();
    const trimmed = text.trim();

    if (!trimmed) {
      return [];
    }

    if (file.name.toLowerCase().endsWith('.json') || trimmed.startsWith('[')) {
      return this.parseJson(trimmed);
    }

    return this.parseCsv(trimmed);
  }

  exportCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): void {
    const header = columns.map(column => this.escapeCsvCell(column.header)).join(';');
    const body = rows
      .map(row => columns.map(column => this.escapeCsvCell(column.value(row))).join(';'))
      .join('\n');

    const content = ['\uFEFF' + header, body].filter(Boolean).join('\n');
    this.downloadFile(filename, content, 'text/csv;charset=utf-8;', 'csv');
  }

  exportPdf<T>(title: string, rows: T[], columns: ExportColumn<T>[]): void {
    const generatedAt = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const logoUrl = new URL('assets/images/jambaar-pay-logo.png', document.baseURI).href;

    const headers = columns.map(column => `<th>${this.escapeHtml(column.header)}</th>`).join('');
    const body = rows.length
      ? rows.map(row => `
          <tr>
            ${columns.map(column => `<td>${this.escapeHtml(column.value(row))}</td>`).join('')}
          </tr>
        `).join('')
      : `<tr><td colspan="${columns.length}">Aucune donnée à exporter.</td></tr>`;

    const html = `
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${this.escapeHtml(title)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 14mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Inter, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              color: #1a1a2e;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .document-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 18px 22px;
              border-bottom: 4px solid #f4c542;
              border-radius: 12px 12px 0 0;
              background: #1a1a2e;
              color: #fff;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .brand-logo {
              width: 130px;
              max-height: 48px;
              object-fit: contain;
              padding: 5px 9px;
              border-radius: 7px;
              background: #fff;
            }
            .brand-copy strong {
              display: block;
              font-size: 18px;
              letter-spacing: 0.2px;
            }
            .brand-copy span {
              display: block;
              margin-top: 4px;
              color: rgba(255, 255, 255, 0.68);
              font-size: 11px;
            }
            .header-mark {
              width: 44px;
              height: 44px;
              border: 2px solid rgba(244, 197, 66, 0.65);
              border-radius: 50%;
              color: #f4c542;
              font-size: 20px;
              font-weight: 800;
              line-height: 40px;
              text-align: center;
            }
            .document-content {
              padding: 24px 4px 0;
            }
            .title-row {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 24px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0;
              color: #1a1a2e;
              font-size: 22px;
              line-height: 1.25;
            }
            .subtitle {
              margin: 7px 0 0;
              color: #737382;
              font-size: 12px;
            }
            .count {
              flex: 0 0 auto;
              padding: 8px 12px;
              border: 1px solid #f0d56e;
              border-radius: 20px;
              background: #fff9df;
              color: #725b00;
              font-size: 11px;
              font-weight: 700;
            }
            table {
              width: 100%;
              overflow: hidden;
              border-collapse: collapse;
              border: 1px solid #e4e4e9;
              border-radius: 9px;
            }
            th,
            td {
              padding: 11px 13px;
              text-align: left;
              font-size: 11px;
            }
            th {
              border-bottom: 2px solid #f4c542;
              background: #1a1a2e;
              color: #fff;
              font-weight: 700;
              letter-spacing: 0.2px;
            }
            td {
              border-bottom: 1px solid #ececf0;
              color: #363642;
            }
            tbody tr:nth-child(even) td {
              background: #f8f8fa;
            }
            tbody tr:last-child td {
              border-bottom: 0;
            }
            .document-footer {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #e5e5e9;
              color: #888894;
              font-size: 9px;
            }
            .document-footer strong {
              color: #1a1a2e;
            }
            @media print {
              .document-header {
                break-inside: avoid;
              }
              thead {
                display: table-header-group;
              }
              tr {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <header class="document-header">
            <div class="brand">
              <img class="brand-logo" src="${this.escapeHtml(logoUrl)}" alt="JambaarPay">
              <div class="brand-copy">
                <strong>JambaarPay</strong>
                <span>La solution de paiement qui simplifie votre quotidien</span>
              </div>
            </div>
            <div class="header-mark">JP</div>
          </header>

          <main class="document-content">
            <div class="title-row">
              <div>
                <h1>${this.escapeHtml(title)}</h1>
                <p class="subtitle">Document généré le ${this.escapeHtml(generatedAt)}</p>
              </div>
              <span class="count">${rows.length} ligne${rows.length > 1 ? 's' : ''}</span>
            </div>

            <table>
              <thead>
                <tr>${headers}</tr>
              </thead>
              <tbody>${body}</tbody>
            </table>

            <footer class="document-footer">
              <span><strong>JambaarPay</strong> · Rapport confidentiel</span>
              <span>Ce document a été généré automatiquement depuis votre espace sécurisé.</span>
            </footer>
          </main>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank', 'width=1200,height=900');

    if (!popup) {
      URL.revokeObjectURL(url);
      throw new Error('Impossible d’ouvrir la fenêtre d’export PDF.');
    }

    const cleanup = () => window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

    popup.addEventListener('load', () => {
      popup.focus();
      window.setTimeout(() => popup.print(), 250);
      cleanup();
    }, { once: true });
  }

  getValue(row: ImportedRecord, aliases: string[]): string {
    for (const alias of aliases) {
      const normalized = this.normalizeKey(alias);
      if (normalized in row) {
        return row[normalized];
      }
    }

    return '';
  }

  normalizeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private parseJson(raw: string): ImportedRecord[] {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Le fichier JSON doit contenir un tableau d’objets.');
    }

    return parsed
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => this.normalizeRecord(item as Record<string, unknown>));
  }

  private parseCsv(raw: string): ImportedRecord[] {
    const delimiter = this.detectDelimiter(raw);
    const rows = this.parseDelimitedText(raw, delimiter)
      .map(row => row.map(cell => cell.trim()))
      .filter(row => row.some(cell => cell.length > 0));

    if (!rows.length) {
      return [];
    }

    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map(header => this.normalizeKey(header));

    return dataRows.map(row => {
      const record: ImportedRecord = {};
      headers.forEach((header, index) => {
        if (header) {
          record[header] = row[index] ?? '';
        }
      });
      return record;
    });
  }

  private normalizeRecord(record: Record<string, unknown>): ImportedRecord {
    return Object.entries(record).reduce<ImportedRecord>((accumulator, [key, value]) => {
      accumulator[this.normalizeKey(key)] = value == null ? '' : String(value).trim();
      return accumulator;
    }, {});
  }

  private detectDelimiter(raw: string): string {
    const sample = raw.split(/\r?\n/, 1)[0] ?? '';
    const delimiters = [';', ',', '\t'];
    return delimiters.reduce((best, current) =>
      sample.split(current).length > sample.split(best).length ? current : best
    , ';');
  }

  private parseDelimitedText(raw: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      const next = raw[index + 1];

      if (char === '"') {
        if (insideQuotes && next === '"') {
          currentCell += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (!insideQuotes && char === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
        continue;
      }

      if (!insideQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        continue;
      }

      currentCell += char;
    }

    currentRow.push(currentCell);
    rows.push(currentRow);
    return rows;
  }

  private escapeCsvCell(value: string | number | null | undefined): string {
    const cell = value == null ? '' : String(value);
    return `"${cell.replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private downloadFile(filename: string, content: string, mimeType: string, extension: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
