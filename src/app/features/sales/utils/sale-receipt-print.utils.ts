const PRINT_BODY_CLASS = 'receipt-print-active';

/**
 * Fişi yazdırır: gövdeye sınıf eklenir (yerleşim gizlenir, yalnız `.sale-receipt` görünür) ve kayıt defterlerinin A4 yatay sayfası
 * bu yazdırma için dikey küçük sayfaya çevrilir. Yazdırma bitince ikisi de geri alınır.
 */
export function printSaleReceipt(doc: Document = document, win: Window = window): void {
    const style = doc.createElement('style');
    style.textContent = '@page { size: A5 portrait; margin: 12mm; @bottom-right { content: none; } }';
    doc.head.appendChild(style);
    doc.body.classList.add(PRINT_BODY_CLASS);
    const cleanup = () => {
        doc.body.classList.remove(PRINT_BODY_CLASS);
        style.remove();
        win.removeEventListener('afterprint', cleanup);
    };
    win.addEventListener('afterprint', cleanup);
    win.print();
}
