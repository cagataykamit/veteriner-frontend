import { computed, DestroyRef, signal } from '@angular/core';

/** Sunucu 60 sn içinde ikinci kod üretmez (sözleşme §3); düğme bu süre boyunca kapalı tutulur. */
export const PORTAL_CODE_RESEND_SECONDS = 60;

/** "Kodu tekrar gönder" geri sayımı. Bileşen ömrüne bağlıdır. */
export class PortalResendTimer {
    private readonly remainingSignal = signal(0);
    private handle: ReturnType<typeof setInterval> | null = null;

    readonly remaining = this.remainingSignal.asReadonly();
    readonly canSend = computed(() => this.remainingSignal() === 0);

    constructor(destroyRef: DestroyRef) {
        destroyRef.onDestroy(() => this.stop());
    }

    start(seconds = PORTAL_CODE_RESEND_SECONDS): void {
        this.stop();
        this.remainingSignal.set(seconds);
        this.handle = setInterval(() => {
            const next = this.remainingSignal() - 1;

            this.remainingSignal.set(Math.max(0, next));

            if (next <= 0) {
                this.stop();
            }
        }, 1000);
    }

    private stop(): void {
        if (this.handle !== null) {
            clearInterval(this.handle);
            this.handle = null;
        }
    }
}
