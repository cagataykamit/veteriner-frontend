import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { hasPendingUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';

/**
 * Kaydedilmemiş değişiklik sorusunun tek sahibi (O2). Soru panel düzenindeki `app-unsaved-changes-dialog` ile gösterilir;
 * rota koruması, sekme kapatma ve diyalog/panel kapanışı hep buradan geçer.
 */
@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
    private readonly document = inject(DOCUMENT);
    private readonly pendingAnswer = signal<((leave: boolean) => void) | null>(null);
    /** Panelde açık sayfa bileşeni; sekme kapatma uyarısı bunun `hasUnsavedChanges()` sonucuna bakar. */
    private activePage: unknown = null;

    readonly asking = computed(() => this.pendingAnswer() !== null);

    constructor() {
        this.document.defaultView?.addEventListener('beforeunload', (event) => this.onBeforeUnload(event));
    }

    /** Sayfa değişikliği soruyu sorar; "Kaydetmeden çık" `true`, "Sayfada kal" `false` döner. */
    confirmLeave(): Promise<boolean> {
        this.pendingAnswer()?.(false);

        return new Promise<boolean>((resolve) => this.pendingAnswer.set(resolve));
    }

    answer(leave: boolean): void {
        const resolve = this.pendingAnswer();

        this.pendingAnswer.set(null);
        resolve?.(leave);
    }

    /** Tek kapanış kuralı: değişiklik yoksa hemen kapatır; varsa sorar, "Sayfada kal" açık bırakır ve bilgi korunur. */
    closeWithCheck(hasChanges: boolean, close: () => void): void {
        if (!hasChanges) {
            close();

            return;
        }

        void this.confirmLeave().then((leave) => {
            if (leave) {
                close();
            }
        });
    }

    setActivePage(component: unknown): void {
        this.activePage = component;
    }

    clearActivePage(component: unknown): void {
        if (this.activePage === component) {
            this.activePage = null;
        }
    }

    private onBeforeUnload(event: BeforeUnloadEvent): void {
        if (hasPendingUnsavedChanges(this.activePage)) {
            event.preventDefault();
            // Eski tarayıcılar uyarıyı yalnız `returnValue` doluysa gösterir.
            event.returnValue = '';
        }
    }
}
