import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import type { AppointmentRequestChannelSummaryVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { appointmentRequestChannelLabel, appointmentRequestChannelSeverity } from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { addGregorianDaysToYmd, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** Varsayılan dönem: bugün dahil son 30 gün. */
const DEFAULT_PERIOD_DAYS = 30;

/**
 * Kaynağa göre talep özeti (TIER-016; sözleşme §14), Randevular > Talepler: seçilen dönemde (talep tarihine göre) her kaynaktan gelen
 * talep ve bunlardan onaylanan. Klinik vitrinin getirisini sayıyla görür; eski talepler "Bilinmiyor" satırındadır.
 */
@Component({
    selector: 'app-appointment-request-channel-summary',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, TableModule, DateInputComponent, FilterFieldComponent, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent],
    template: `
        <div class="card" data-testid="channel-summary">
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
                <div>
                    <h2 class="text-lg font-semibold m-0 mb-1">Kaynağa göre talepler</h2>
                    <p class="text-sm text-muted-color m-0">Seçilen dönemde gelen talepler (talep tarihine göre) ve bunlardan onaylananlar.</p>
                </div>
                <div class="flex flex-wrap items-end gap-3">
                    <app-filter-field label="Başlangıç" labelFor="channelSummaryFrom" width="date">
                        <app-date-input inputId="channelSummaryFrom" type="date" min="1900-01-01" [ngModel]="from()" (ngModelChange)="onFromChange($event)" />
                    </app-filter-field>
                    <app-filter-field label="Bitiş" labelFor="channelSummaryTo" width="date">
                        <app-date-input inputId="channelSummaryTo" type="date" min="1900-01-01" [ngModel]="to()" (ngModelChange)="onToChange($event)" />
                    </app-filter-field>
                </div>
            </div>

            @if (loading()) {
                <app-loading-state message="Özet yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (summary(); as s) {
                @if (s.rows.length === 0) {
                    <p class="text-sm text-muted-color m-0" data-testid="channel-summary-empty">Bu dönemde talep yok.</p>
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="s.rows" [tableStyle]="{ 'min-width': '28rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>Kaynak</th>
                                    <th class="text-right">Talep</th>
                                    <th class="text-right">Onaylanan</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-r>
                                <tr data-testid="channel-summary-row">
                                    <td><app-status-tag [label]="channelLabel(r.channel)" [severity]="channelSeverity(r.channel)" /></td>
                                    <td class="text-right tabular-nums">{{ r.total }}</td>
                                    <td class="text-right tabular-nums">{{ r.approved }}</td>
                                </tr>
                            </ng-template>
                            <ng-template #footer>
                                <tr>
                                    <td class="font-semibold">Toplam</td>
                                    <td class="text-right tabular-nums font-semibold" data-testid="channel-summary-total">{{ s.total }}</td>
                                    <td class="text-right tabular-nums font-semibold">{{ s.approved }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            }
        </div>
    `
})
export class AppointmentRequestChannelSummaryComponent implements OnInit {
    private readonly service = inject(AppointmentRequestsService);
    private readonly today = toIstanbulDateInputValue(new Date().toISOString());

    readonly from = signal(addGregorianDaysToYmd(this.today, -(DEFAULT_PERIOD_DAYS - 1)) ?? this.today);
    readonly to = signal(this.today);
    readonly summary = signal<AppointmentRequestChannelSummaryVm | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    channelLabel = appointmentRequestChannelLabel;
    channelSeverity = appointmentRequestChannelSeverity;

    private loadSeq = 0;

    ngOnInit(): void {
        this.load();
    }

    onFromChange(value: string): void {
        this.from.set(value);
        this.load();
    }

    onToChange(value: string): void {
        this.to.set(value);
        this.load();
    }

    /** Talep kararı sonrası sayfa da çağırır: onaylanan sayısı değişir. */
    load(): void {
        const from = this.from();
        const to = this.to();

        // Yarım ya da ters aralıkta istek atılmaz; son geçerli özet ekranda kalır.
        if (!from || !to || from > to) {
            return;
        }

        const seq = ++this.loadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.service.channelSummary(from, to).subscribe({
            next: (summary) => {
                if (seq === this.loadSeq) {
                    this.summary.set(summary);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Kaynak özeti yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }
}
