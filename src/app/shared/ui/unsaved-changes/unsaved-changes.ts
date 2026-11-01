import { InjectionToken } from '@angular/core';
import type { ConfirmationService } from 'primeng/api';

/**
 * Kapanmadan önce "kaydedilmemiş değişiklik" sorusu gereken gömülü formların ortak yüzü.
 * Form kendini `HAS_UNSAVED_CHANGES` ile sunar; kapatan taraf (yan panel, diyalog) tek kuralla sorar.
 */
export interface HasUnsavedChanges {
    hasUnsavedChanges(): boolean;
}

export const HAS_UNSAVED_CHANGES = new InjectionToken<HasUnsavedChanges>('HAS_UNSAVED_CHANGES');

/** Onay metni: KVKK şablonu ve diğer "kaydedilmemiş değişiklik" uyarılarıyla aynı dil. */
export const UNSAVED_CHANGES_CONFIRM = {
    header: 'Kaydedilmemiş değişiklik',
    message: 'Girdiğiniz bilgiler kaydedilmedi, kapatılsın mı?',
    acceptLabel: 'Kapat',
    rejectLabel: 'Vazgeç'
} as const;

/**
 * Tek kapanış kuralı: değişiklik yoksa hemen kapatır; varsa onay sorar — "Kapat" kapatır, "Vazgeç" açık bırakır ve bilgi korunur.
 * Dışarı tıklama, Esc, çarpı ve İptal hepsi bu kuraldan geçer.
 */
export function closeWithUnsavedChangesCheck(confirmation: ConfirmationService, hasChanges: boolean, close: () => void): void {
    if (!hasChanges) {
        close();

        return;
    }

    confirmation.confirm({
        ...UNSAVED_CHANGES_CONFIRM,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonStyleClass: 'p-button-secondary',
        accept: close
    });
}
