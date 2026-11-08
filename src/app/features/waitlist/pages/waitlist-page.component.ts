import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { appointmentTypeLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import type { WaitlistEntryDto, WaitlistEntryStatus } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import {
    WAITLIST_STATUS_LABELS,
    waitlistBlockerLabel,
    waitlistDaysText,
    waitlistOfferStatusLabel,
    waitlistStatusLabel,
    waitlistStatusSeverity,
    waitlistTimeText
} from '@/app/entities/waitlist/utils/waitlist-labels.utils';
import { WaitlistEntryDialogComponent } from '@/app/features/waitlist/components/waitlist-entry-dialog.component';
import { WaitlistHistoryDialogComponent } from '@/app/features/waitlist/components/waitlist-history-dialog.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

type StatusFilter = WaitlistEntryStatus | 'All';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
    { label: WAITLIST_STATUS_LABELS.Waiting, value: 'Waiting' },
    { label: WAITLIST_STATUS_LABELS.Booked, value: 'Booked' },
    { label: WAITLIST_STATUS_LABELS.Closed, value: 'Closed' },
    { label: 'Tümü', value: 'All' }
];

/** `yyyy-MM-dd` → `gg.aa.yyyy`. */
function dateText(value: string): string {
    const [y, m, d] = value.split('-');

    return y && m && d ? `${d}.${m}.${y}` : value;
}

/**
 * Randevular > Bekleme listesi (TIER-018; Veteriner `docs/WAITLIST_API_CONTRACT.md`). Seçili kliniğin kayıtları sırayla; filtre hekim ve
 * durum. Personel listeye ekler, sırayı kaydırır, kaydı kapatır ve geçmişi görür. Saat boşalınca teklif backend işleyicisinden ya da
 * iptal ekranından gider. Alt pakette mevcut kayıtlar okunur, ekleme yerine "üst pakete geç" kutusu çıkar.
 */
@Component({
    selector: 'app-waitlist-page',
    providers: [MessageService],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ButtonModule,
        SelectModule,
        TableModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppPlanUpgradeNoticeComponent,
        AppStatusTagComponent,
        ReasonConfirmDialogComponent,
        WaitlistEntryDialogComponent,
        WaitlistHistoryDialogComponent
    ],
    template: `
        <p-toast position="top-right" />
        <app-page-header title="Bekleme listesi" description="Erken randevu isteyen hasta sahipleri. Bir randevu iptal edilince saat, sıradaki uygun kişiye e-postayla teklif edilir; kabul ederse randevu oluşur.">
            @if (canWrite()) {
                <button actions pButton type="button" (click)="addVisible.set(true)" data-testid="wl-add"><i class="pi pi-plus"></i>Listeye ekle</button>
            }
        </app-page-header>

        @if (planLocked()) {
            <section class="card mb-4" data-testid="wl-locked">
                <app-plan-upgrade-notice
                    feature="Waitlist"
                    [detail]="items().length > 0 ? 'Mevcut kayıtlar aşağıda kalır; yeni kayıt ve otomatik teklif için Profesyonel ya da Kurumsal paket gerekir.' : 'İptal edilen saat, bekleme listesindeki sıradaki hasta sahibine otomatik teklif edilir; boş saat dolar.'"
                />
            </section>
        }

        @if (!clinicId) {
            <div class="card"><app-empty-state message="Önce bir klinik seçin." /></div>
        } @else {
            <div class="card">
                <div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                    <div class="flex flex-col gap-1 w-full md:max-w-xs">
                        <label for="wlVetFilter" class="text-sm font-medium text-muted-color">Hekim</label>
                        <p-select inputId="wlVetFilter" [options]="veterinarians()" optionLabel="name" optionValue="userId" [ngModel]="vetFilter()" (ngModelChange)="onVetChange($event)" [showClear]="true" placeholder="Tüm hekimler" class="w-full" data-testid="wl-vet-filter" />
                    </div>
                    <div class="flex flex-col gap-1 w-full md:max-w-xs">
                        <label for="wlStatusFilter" class="text-sm font-medium text-muted-color">Durum</label>
                        <p-select inputId="wlStatusFilter" [options]="statusOptions" optionLabel="label" optionValue="value" [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)" class="w-full" data-testid="wl-status-filter" />
                    </div>
                </div>

                @if (loading()) {
                    <app-loading-state message="Bekleme listesi yükleniyor…" />
                } @else if (error(); as e) {
                    <app-error-state [detail]="e" (retry)="load()" />
                } @else if (items().length === 0) {
                    <app-empty-state [message]="statusFilter() === 'Waiting' ? 'Bekleme listesinde kimse yok.' : 'Bu filtreye uyan kayıt yok.'" [hint]="canWrite() ? 'Erken randevu isteyen hasta sahibini listeye ekleyin; saat boşalınca teklif gider.' : ''" />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="items()" [tableStyle]="{ 'min-width': '56rem' }" [rowHover]="true" data-testid="wl-table">
                            <ng-template #header>
                                <tr>
                                    <th>Sıra</th>
                                    <th>Hasta ve sahip</th>
                                    <th>İstenen hekim</th>
                                    <th>Ne zaman uygun</th>
                                    <th>Tür</th>
                                    <th>Durum</th>
                                    <th><span class="sr-only">İşlemler</span></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr data-testid="wl-row">
                                    <td>{{ row.position ?? '—' }}</td>
                                    <td>
                                        <div class="font-medium">{{ row.petName }}</div>
                                        <small class="text-muted-color">{{ row.clientName }}</small>
                                        @if (blocker(row); as b) {
                                            <div class="text-xs text-amber-700 dark:text-amber-300" data-testid="wl-blocker"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ b }}</div>
                                        }
                                    </td>
                                    <td>{{ row.preferredVeterinarianName ?? 'Fark etmez' }}</td>
                                    <td>
                                        <div>{{ dateText(row.earliestDate) }} – {{ dateText(row.latestDate) }}</div>
                                        <small class="text-muted-color">{{ daysText(row.preferredDays) }}{{ timeRange(row) }}</small>
                                        @if (row.note) {<div class="text-xs text-muted-color">{{ row.note }}</div>}
                                    </td>
                                    <td>{{ typeLabel(row.appointmentType) }}</td>
                                    <td>
                                        <app-status-tag [label]="row.isPastRange && row.status === 'Waiting' ? 'Tarihi geçti' : statusLabel(row.status)" [severity]="row.isPastRange && row.status === 'Waiting' ? 'warn' : statusSeverity(row.status)" />
                                        @if (row.openOffer; as o) {
                                            <div class="text-xs mt-1" data-testid="wl-open-offer">{{ offerLabel(o.status) }} · saat {{ when(o.slotStartUtc) }} · son {{ when(o.expiresAtUtc) }}</div>
                                        }
                                    </td>
                                    <td class="text-right whitespace-nowrap">
                                        @if (canWrite() && row.status === 'Waiting') {
                                            <button pButton type="button" class="p-button-text p-button-sm" [disabled]="busy() || row.position === 1" (click)="move(row, 'Up')" aria-label="Sırada öne al" title="Sırada öne al"><i class="pi pi-arrow-up"></i></button>
                                            <button pButton type="button" class="p-button-text p-button-sm" [disabled]="busy()" (click)="move(row, 'Down')" aria-label="Sırada geriye al" title="Sırada geriye al"><i class="pi pi-arrow-down"></i></button>
                                        }
                                        <button pButton type="button" class="p-button-text p-button-sm" (click)="openHistory(row)" data-testid="wl-history-button"><i class="pi pi-history"></i>Geçmiş</button>
                                        @if (canClose() && row.status === 'Waiting') {
                                            <button pButton type="button" class="p-button-text p-button-sm p-button-danger" (click)="openClose(row)" data-testid="wl-close-button"><i class="pi pi-times"></i>Kapat</button>
                                        }
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </div>

            <app-waitlist-entry-dialog [(visible)]="addVisible" [clinicId]="clinicId" [veterinarians]="veterinarians()" (saved)="onSaved($event)" />
            <app-waitlist-history-dialog [(visible)]="historyVisible" [entryId]="historyId()" />
            @if (closeTarget(); as t) {
                <app-reason-confirm-dialog
                    [(visible)]="closeVisible"
                    header="Kaydı kapat"
                    [summary]="t.petName + ' · ' + t.clientName"
                    description="Kayıt bekleme listesinden çıkar; açık teklif varsa geri çekilir. Gerekçe yazarsanız kayıt geçmişinde görünür."
                    confirmLabel="Kaydı kapat"
                    failureFallback="Kayıt kapatılamadı."
                    [reasonOptional]="true"
                    [execute]="executeClose"
                    (confirmed)="load()"
                />
            }
        }
    `
})
export class WaitlistPageComponent implements OnInit {
    private readonly api = inject(WaitlistService);
    private readonly visits = inject(VisitsService);
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly clinicId = this.auth.getClinicId() ?? '';
    protected readonly statusOptions = STATUS_OPTIONS;
    protected readonly dateText = dateText;
    protected readonly daysText = waitlistDaysText;
    protected readonly typeLabel = appointmentTypeLabel;
    protected readonly statusLabel = waitlistStatusLabel;
    protected readonly statusSeverity = waitlistStatusSeverity;
    protected readonly offerLabel = waitlistOfferStatusLabel;
    protected readonly when = formatUtcIsoAsLocalDateTimeDisplay;

    readonly items = signal<WaitlistEntryDto[]>([]);
    readonly veterinarians = signal<VeterinarianVm[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly busy = signal(false);
    readonly vetFilter = signal<string | null>(null);
    readonly statusFilter = signal<StatusFilter>('Waiting');
    readonly addVisible = signal(false);
    readonly historyVisible = signal(false);
    readonly historyId = signal<string | null>(null);
    readonly closeVisible = signal(false);
    readonly closeTarget = signal<WaitlistEntryDto | null>(null);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('Waitlist') !== null);
    private readonly hasCreateClaim = this.auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM);
    /** Ekleme ve sıra: paket, yazma kilidi ve randevu oluşturma izni. */
    readonly canWrite = computed(() => this.hasCreateClaim && !this.planLocked() && !this.ro.mutationBlocked());
    /** Kapatma her pakette açıktır (paket düşünce kayıt yönetilebilir). */
    readonly canClose = computed(() => this.hasCreateClaim && !this.ro.mutationBlocked());

    protected readonly executeClose = (reason: string) => this.api.close(this.closeTarget()!.id, reason.trim() || null);

    ngOnInit(): void {
        if (!this.clinicId) {
            return;
        }

        this.visits.getVeterinarians(this.clinicId).subscribe({ next: (v) => this.veterinarians.set(v), error: () => this.veterinarians.set([]) });
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        const status = this.statusFilter();

        this.api.list({ clinicId: this.clinicId, veterinarianUserId: this.vetFilter(), status: status === 'All' ? null : status }).subscribe({
            next: (rows) => {
                this.items.set(rows);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'Bekleme listesi yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    onVetChange(value: string | null): void {
        this.vetFilter.set(value ?? null);
        this.load();
    }

    onStatusChange(value: StatusFilter): void {
        this.statusFilter.set(value);
        this.load();
    }

    blocker(row: WaitlistEntryDto): string | null {
        return row.status === 'Waiting' ? waitlistBlockerLabel(row.offerBlocker) : null;
    }

    timeRange(row: WaitlistEntryDto): string {
        const from = waitlistTimeText(row.preferredFromTime);
        const to = waitlistTimeText(row.preferredToTime);

        return from || to ? ` · ${from ?? '…'}–${to ?? '…'}` : '';
    }

    move(row: WaitlistEntryDto, direction: 'Up' | 'Down'): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);
        this.api.move(row.id, direction).subscribe({
            next: () => {
                this.busy.set(false);
                this.load();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.toast('error', 'Sıra değiştirilemedi', panelHttpFailureMessage(err, 'Sıra değiştirilemedi.'));
                this.load();
            }
        });
    }

    openHistory(row: WaitlistEntryDto): void {
        this.historyId.set(row.id);
        this.historyVisible.set(true);
    }

    openClose(row: WaitlistEntryDto): void {
        this.closeTarget.set(row);
        this.closeVisible.set(true);
    }

    onSaved(event: { entry: WaitlistEntryDto; warning: string | null }): void {
        if (event.warning) {
            this.toast('warn', 'Listeye eklendi', `${event.entry.petName}: ${event.warning}. Saat boşalınca müşteriyi arayabilirsiniz.`);
        } else {
            this.toast('success', 'Listeye eklendi', `${event.entry.petName} bekleme listesinde ${event.entry.position ?? ''}. sırada.`);
        }

        this.load();
    }

    private toast(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
        addTracedToast(this.messages, 'WaitlistPage', 'appointments/waitlist', { severity, summary, detail, life: 6000 });
    }
}
