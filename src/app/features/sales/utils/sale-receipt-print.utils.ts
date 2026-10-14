import { printWithPageStyle } from '@/app/shared/utils/print.utils';

/** Fişi yazdırır: yerleşim gizlenir, yalnız `.sale-receipt` görünür (`_print.scss`); sayfa dikey küçük (A5) olur. */
export function printSaleReceipt(doc: Document = document, win: Window = window): void {
    printWithPageStyle('receipt-print-active', '@page { size: A5 portrait; margin: 12mm; @bottom-right { content: none; } }', doc, win);
}
