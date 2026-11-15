import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';

/**
 * İptal bildirimi ve "Geri al" (APPOINTMENT_CANCEL_UNDO_API_CONTRACT.md). Düğme sunucunun verdiği süre kadar görünür ve geri sayar;
 * süre bitince yalnız "Randevu iptal edildi." kalır. Geri alma başarısızsa sunucu metni gösterilir (ör. süre doldu, saat teklif edildi).
 */
@Component({
    selector: 'app-appointment-cancel-undo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule],
    template: `
        <div class="flex flex-wrap items-center gap-3 rounded-border border border-surface p-3" role="status" aria-live="polite" data-testid="appointment-cancel-undo">
            @switch (state()) {
                @case ('reverted') {
                    <p class="m-0 text-sm"><i class="pi pi-check-circle mr-2 text-primary" aria-hidden="true"></i>İptal geri alındı.</p>
                }
                @default {
                    <p class="m-0 text-sm"><i class="pi pi-ban mr-2 text-muted-color" aria-hidden="true"></i>Randevu iptal edildi.</p>
                    @if (state() === 'open' || state() === 'reverting') {
                        <button pButton type="button" class="p-button-sm p-button-outlined" [disabled]="state() === 'reverting'" (click)="revert()" data-testid="appointment-cancel-undo-button">
                            <i class="pi pi-undo"></i>Geri al ({{ remaining() }})
                        </button>
                    }
                    @if (error(); as e) {
                        <p class="m-0 text-sm text-red-600 dark:text-red-400 basis-full" data-testid="appointment-cancel-undo-error">{{ e }}</p>
                    }
                }
            }
        </div>
    `
})
export class AppointmentCancelUndoComponent {
    readonly appointmentId = input.required<string>();
    /** Sunucunun iptal yanıtındaki süre; 0 ise düğme çıkmaz. */
    readonly undoWindowSeconds = input.required<number>();
    readonly reverted = output<void>();

    private readonly appointments = inject(AppointmentsService);

    protected readonly remaining = signal(0);
    protected readonly state = signal<'open' | 'reverting' | 'reverted' | 'closed'>('closed');
    protected readonly error = signal<string | null>(null);

    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Yeni iptal (başka randevu ya da aynı randevu yeniden) geri sayımı baştan başlatır.
        effect(() => {
            const seconds = this.undoWindowSeconds();

            this.appointmentId();
            untracked(() => this.start(seconds));
        });
        inject(DestroyRef).onDestroy(() => this.stop());
    }

    protected revert(): void {
        if (this.state() !== 'open') {
            return;
        }

        this.stop();
        this.state.set('reverting');
        this.error.set(null);
        this.appointments.revertCancellation(this.appointmentId()).subscribe({
            next: () => {
                this.state.set('reverted');
                this.reverted.emit();
            },
            error: (e: unknown) => {
                this.state.set('closed');
                this.error.set(e instanceof Error ? e.message : 'İptal geri alınamadı.');
            }
        });
    }

    private start(seconds: number): void {
        this.stop();
        this.error.set(null);
        this.remaining.set(seconds);
        this.state.set(seconds > 0 ? 'open' : 'closed');

        if (seconds <= 0) {
            return;
        }

        this.timer = setInterval(() => {
            const next = this.remaining() - 1;

            this.remaining.set(Math.max(0, next));

            if (next <= 0) {
                this.stop();
                this.state.set('closed');
            }
        }, 1000);
    }

    private stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
