import { ChangeDetectionStrategy, Component, effect, inject, input, model, signal, untracked } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import type { WaitlistEntryDetailDto } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { waitlistEventLabel } from '@/app/entities/waitlist/utils/waitlist-labels.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';

/** Bekleme kaydının geçmişi (TIER-018; sözleşme §2 `GET /{id}`): teklif gitti, süre doldu, kabul etti… kim ve ne zaman. */
@Component({
    selector: 'app-waitlist-history-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DialogModule, AppLoadingStateComponent, AppErrorStateComponent],
    template: `
        <p-dialog header="Kayıt geçmişi" [(visible)]="visible" [modal]="true" [style]="{ width: '32rem' }" [breakpoints]="{ '640px': '95vw' }">
            @if (loading()) {
                <app-loading-state message="Geçmiş yükleniyor…" />
            } @else if (error(); as e) {
                <app-error-state [detail]="e" (retry)="load()" />
            } @else if (detail(); as d) {
                <p class="m-0 mb-3 font-medium">{{ d.entry.petName }} · {{ d.entry.clientName }}</p>
                <ol class="m-0 p-0 list-none flex flex-col gap-2" data-testid="wl-history">
                    @for (e of d.events; track $index) {
                        <li class="flex flex-col">
                            <span class="text-sm">{{ label(e.type) }}@if (e.offerSlotStartUtc) {<span class="text-muted-color"> · saat {{ when(e.offerSlotStartUtc) }}</span>}</span>
                            <small class="text-muted-color">{{ when(e.occurredAtUtc) }} · {{ e.actorName ?? (e.type === 'OfferAccepted' || e.type === 'OfferDeclined' || e.type === 'OfferSlotTaken' ? 'Hasta sahibi' : 'Sistem') }}</small>
                        </li>
                    }
                </ol>
            }
        </p-dialog>
    `
})
export class WaitlistHistoryDialogComponent {
    private readonly api = inject(WaitlistService);

    readonly visible = model(false);
    readonly entryId = input<string | null>(null);

    readonly detail = signal<WaitlistEntryDetailDto | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    protected readonly label = waitlistEventLabel;
    protected readonly when = formatUtcIsoAsLocalDateTimeDisplay;

    private readonly loadEffect = effect(() => {
        if (this.visible() && this.entryId()) {
            untracked(() => this.load());
        }
    });

    load(): void {
        const id = this.entryId();

        if (!id) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.api.detail(id).subscribe({
            next: (d) => {
                this.detail.set(d);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'Geçmiş yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
