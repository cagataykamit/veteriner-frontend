/** CSV satır üretimi (Excel TR için varsayılan ayırıcı `;`). */

const DEFAULT_DELIMITER = ';';

function escapeCsvField(value: string, delimiter: string): string {
    const mustQuote = value.includes(delimiter) || value.includes('"') || /[\r\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
}

export function buildCsvFromStringRows(header: string[], rows: string[][], delimiter = DEFAULT_DELIMITER): string {
    const lines: string[] = [
        header.map((c) => escapeCsvField(c, delimiter)).join(delimiter),
        ...rows.map((row) => row.map((c) => escapeCsvField(c ?? '', delimiter)).join(delimiter))
    ];
    return lines.join('\r\n');
}

/** UTF-8 BOM ile Excel’de Türkçe karakterler için güvenli indirme. */
export function csvTextToUtf8BlobWithBom(csvText: string): Blob {
    return new Blob(['\uFEFF', csvText], { type: 'text/csv;charset=utf-8' });
}
