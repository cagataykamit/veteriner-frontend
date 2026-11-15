import { InjectionToken } from '@angular/core';

/**
 * Kaydedilmemiş değişikliği olan formların ortak yüzü (O2).
 * Sayfa bileşeni bunu uygularsa rota koruması (`unsavedChangesGuard`) ve sekme kapatma uyarısı (`beforeunload`) aynı kuraldan sorar;
 * gömülü form kendini `HAS_UNSAVED_CHANGES` ile sunar, kapatan taraf (yan panel, diyalog) aynı soruyu sorar.
 */
export interface HasUnsavedChanges {
    hasUnsavedChanges(): boolean;
}

export const HAS_UNSAVED_CHANGES = new InjectionToken<HasUnsavedChanges>('HAS_UNSAVED_CHANGES');

/** Tek soru metni: sayfadan çıkış, sekme kapatma ve dolu diyalog/panel kapanışı aynı dili kullanır. */
export const UNSAVED_CHANGES_CONFIRM = {
    header: 'Kaydedilmemiş değişiklik',
    message: 'Kaydedilmemiş değişiklikler var. Çıkılsın mı?',
    stayLabel: 'Sayfada kal',
    leaveLabel: 'Kaydetmeden çık'
} as const;

/** Bileşen `HasUnsavedChanges` uyguluyor ve şu an kaydedilmemiş değişikliği var mı. */
export function hasPendingUnsavedChanges(component: unknown): boolean {
    const candidate = component as Partial<HasUnsavedChanges> | null | undefined;

    return typeof candidate?.hasUnsavedChanges === 'function' && candidate.hasUnsavedChanges();
}
