/** Klavyeyle odaklanabilen ilk öğe: yerel alan ya da PrimeNG bileşeninin içindeki giriş/combobox. */
const FOCUSABLE = 'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role=combobox]:not([aria-disabled=true]), [tabindex]:not([tabindex="-1"])';

export function focusableIn(element: HTMLElement): HTMLElement | null {
    return element.matches(FOCUSABLE) ? element : element.querySelector<HTMLElement>(FOCUSABLE);
}

/** Etiket metninden zorunlu işaretini ve "(isteğe bağlı)" ekini atar: "Telefon *" → "Telefon". */
export function cleanFieldLabel(text: string | null | undefined): string {
    return (text ?? '')
        .replace(/\(isteğe bağlı\)/gi, '')
        .replace(/[*:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Alanın ekrandaki adı: bağlı `<label for>`, yoksa `aria-label`. */
export function fieldLabelFromDom(element: HTMLElement): string {
    const target = focusableIn(element) ?? element;
    const id = target.id || element.id;
    const root = element.closest('form') ?? element.ownerDocument;
    const label = id ? root.querySelector(`label[for="${CSS.escape(id)}"]`) : null;

    return cleanFieldLabel(label?.textContent ?? target.getAttribute('aria-label') ?? element.getAttribute('aria-label'));
}

/** Alanı ekranın ortasına kaydırıp odaklar (O3). */
export function revealField(element: HTMLElement): void {
    const target = focusableIn(element) ?? element;

    element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    target.focus({ preventScroll: true });
}
