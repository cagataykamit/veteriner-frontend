/**
 * Liste spec'leri için satır Düzenle simgesi yardımcıları (ADR-026 madde 6).
 * Düzenle; etiketi alana göre değişebildiği için (örn. "Sonuç gir") simgesinden bulunur.
 */
export function rowEditActions(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll('app-row-action-button .fa-pen-to-square')).map((icon) => icon.closest('a, button') as HTMLElement);
}

/** Satır Sil/İptal simgeleri (ADR-026 madde 7); etiketi alana göre değişebildiği için simgesinden bulunur. */
export function rowDangerActions(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll('app-row-action-button .fa-trash-can, app-row-action-button .fa-ban')).map((icon) => icon.closest('a, button') as HTMLElement);
}

/** Sil/İptal satırdaki son eylemdir (Detay, Düzenle, sonra Sil/İptal). */
export function isLastRowAction(action: HTMLElement): boolean {
    return !action.closest('app-row-action-button')?.nextElementSibling;
}

/** Ortak sıra: Detay, Düzenle, sonra Sil/İptal — Düzenle aynı satırda Detay'ın hemen ardındadır. */
export function isRightAfterDetail(action: HTMLElement): boolean {
    return !!action.closest('app-row-action-button')?.previousElementSibling?.querySelector('.fa-eye');
}
