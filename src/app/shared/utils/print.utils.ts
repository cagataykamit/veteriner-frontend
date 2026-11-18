/**
 * Belge yazdırır: yazdırma süresince gövdeye sınıf (yerleşimi gizleyen `_print.scss` kuralları) ve bir `@page` kuralı eklenir;
 * kayıt defterlerinin A4 yatay sayfası bu yazdırma için ezilir. Yazdırma bitince ikisi de geri alınır.
 */
export function printWithPageStyle(bodyClass: string, pageCss: string, doc: Document = document, win: Window = window): void {
    const style = doc.createElement('style');

    style.textContent = pageCss;
    doc.head.appendChild(style);
    doc.body.classList.add(bodyClass);

    const cleanup = () => {
        doc.body.classList.remove(bodyClass);
        style.remove();
        win.removeEventListener('afterprint', cleanup);
    };

    win.addEventListener('afterprint', cleanup);
    win.print();
}

/**
 * Sayfadaki tek bir öğeyi (ör. hasta sahibine açıklama metni) A4 dikey yazdırır: yazdırma süresince yalnız o öğe görünür
 * (`_print.scss` `print-element-active`). Yazdırma bitince işaretler kaldırılır.
 */
export function printElement(el: HTMLElement, doc: Document = document, win: Window = window): void {
    el.classList.add('print-element-target');

    const cleanup = () => {
        el.classList.remove('print-element-target');
        win.removeEventListener('afterprint', cleanup);
    };

    win.addEventListener('afterprint', cleanup);
    printWithPageStyle('print-element-active', '@page { size: A4 portrait; margin: 18mm 16mm; }', doc, win);
}
