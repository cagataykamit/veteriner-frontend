import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    EXAMINATIONS_CREATE_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_CREATE_CLAIM,
    VISITS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VisitArrivalDialogComponent } from '@/app/features/visits/components/visit-arrival-dialog.component';
import { VisitCorrectionDialogComponent } from '@/app/features/visits/components/visit-correction-dialog.component';
import type { TodayItemVm, TodayVm, VisitCreateResultVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import {
    careStatusLabel,
    careStatusSeverity,
    formatElapsedSince,
    groupTodayItems,
    todayItemActions
} from '@/app/features/visits/utils/visit-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/** Resepsiyon ve hekimin aynı kuyruğu güncel görmesi için otomatik yenileme aralığı. */
const REFRESH_INTERVAL_MS = 30_000;

type RefreshMode = 'initial' | 'silent';

/**
 * Bugün: o günün randevuları ve gelen hastalar tek listede (randevulu Visit tek satır).
 * Ödeme / açık iş göstergesi bilinçli olarak yoktur.
 */
@Component({
    selector: 'app-today-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TableModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        VisitArrivalDialogComponent,
        VisitCorrectionDialogComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" />
        <app-page-header title="Bugün" subtitle="Klinik" description="Bugünün randevuları ve gelen hastalar.">
            <div actions class="flex flex-wrap gap-2">
                <p-button
                    type="button"
                    [label]="copy.buttonRefresh"
                    icon="pi pi-refresh"
                    severity="secondary"
                    (onClick)="refresh('silent')"
                />
                @if (canCreateVisit) {
                    <p-button
                        type="button"
                        label="Randevusuz geliş"
                        icon="pi pi-plus"
                        [disabled]="ro.mutationBlocked()"
                        (onClick)="openWalkInArrival()"
                    />
                }
            </div>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="Bugün yükleniyor…" />
        } @else if (loadError(); as error) {
            <div class="card">
                <app-error-state [detail]="error" (retry)="refresh('initial')" />
            </div>
        } @else {
            @if (refreshError()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">{{ refreshError() }}</p>
            }
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; değişiklik kaydedilemez.
                </p>
            }
            @for (group of groups(); track group.key) {
                <section class="card mb-4" [attr.aria-label]="group.title">
                    <h2 class="text-lg font-semibold mt-0 mb-3">{{ group.title }} ({{ group.items.length }})</h2>
                    <p-table [value]="group.items" dataKey="key" styleClass="p-datatable-sm">
                        <ng-template #header>
                            <tr>
                                <th>Saat</th>
                                <th>Hasta</th>
                                <th>Sahip</th>
                                <th>Hekim</th>
                                <th>Durum</th>
                                <th>Bekleme</th>
                                <th></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-item>
                            <tr>
                                <td>
                                    @if (item.arrivedAtUtc) {
                                        <div>Geliş {{ time(item.arrivedAtUtc) }}</div>
                                        @if (item.scheduledAtUtc) {
                                            <div class="text-sm text-muted-color">Randevu {{ time(item.scheduledAtUtc) }}</div>
                                        }
                                    } @else {
                                        <div>Randevu {{ time(item.scheduledAtUtc) }}</div>
                                    }
                                </td>
                                <td>
                                    <div class="font-medium">{{ item.petName }}</div>
                                    <div class="text-sm text-muted-color">{{ item.speciesName }}</div>
                                </td>
                                <td>
                                    <div>{{ item.clientName }}</div>
                                    @if (item.clientPhone) {
                                        <div class="text-sm text-muted-color">{{ item.clientPhone }}</div>
                                    }
                                </td>
                                <td>{{ item.responsibleVeterinarianName ?? '—' }}</td>
                                <td>
                                    <div class="flex flex-wrap gap-1">
                                        @if (item.careStatus; as status) {
                                            <app-status-tag [label]="statusLabel(status)" [severity]="statusSeverity(status)" />
                                        } @else if (item.appointmentStatus === 'Completed') {
                                            <app-status-tag label="Randevu tamamlandı" severity="secondary" />
                                        } @else {
                                            <app-status-tag label="Bekleniyor" severity="secondary" />
                                        }
                                        @if (item.isCarriedOver) {
                                            <app-status-tag label="Önceki günden" severity="contrast" />
                                        }
                                    </div>
                                </td>
                                <td>{{ elapsed(item) ?? '—' }}</td>
                                <td>
                                    <div class="flex flex-wrap gap-2 justify-end">
                                        @let actions = actionsOf(item);
                                        @if (canCreateVisit && actions.canMarkArrived) {
                                            <p-button
                                                type="button"
                                                label="Geldi"
                                                icon="pi pi-sign-in"
                                                size="small"
                                                [disabled]="ro.mutationBlocked()"
                                                (onClick)="openAppointmentArrival(item)"
                                            />
                                        }
                                        @if (canCreateExamination && actions.canOpenExamination) {
                                            <p-button
                                                type="button"
                                                label="Muayene aç"
                                                icon="pi pi-file-edit"
                                                size="small"
                                                [disabled]="ro.mutationBlocked()"
                                                (onClick)="openExamination(item)"
                                            />
                                        }
                                        @if (canUpdateVisit && actions.canStartCare) {
                                            <p-button
                                                type="button"
                                                label="Başlat"
                                                icon="pi pi-play"
                                                size="small"
                                                severity="secondary"
                                                [loading]="isBusy(item)"
                                                [disabled]="isBusy(item) || ro.mutationBlocked()"
                                                (onClick)="transition(item, 'start')"
                                            />
                                        }
                                        @if (canUpdateVisit && actions.canCompleteCare) {
                                            <p-button
                                                type="button"
                                                label="Tamamla"
                                                icon="pi pi-check"
                                                size="small"
                                                severity="secondary"
                                                [loading]="isBusy(item)"
                                                [disabled]="isBusy(item) || ro.mutationBlocked()"
                                                (onClick)="transition(item, 'complete')"
                                            />
                                        }
                                        @if (canCorrect && actions.canCorrect) {
                                            <p-button
                                                type="button"
                                                label="Düzelt"
                                                icon="pi pi-pencil"
                                                size="small"
                                                severity="secondary"
                                                [text]="true"
                                                [disabled]="ro.mutationBlocked()"
                                                (onClick)="openCorrection(item)"
                                            />
                                        }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </section>
            } @empty {
                <div class="card">
                    <app-empty-state
                        message="Bugün için randevu veya gelen hasta yok."
                        hint="Randevusuz gelen hastayı “Randevusuz geliş” ile kaydedebilirsiniz."
                        iconClass="pi pi-calendar"
                    />
                </div>
            }
        }

        @if (canCreateVisit) {
            <app-visit-arrival-dialog [(visible)]="arrivalOpen" [appointment]="arrivalAppointment()" (arrived)="onArrived($event)" />
        }
        @if (canCorrect) {
            <app-visit-correction-dialog [(visible)]="correctionOpen" [item]="correctionItem()" (corrected)="onCorrected()" />
        }
    `
})
export class TodayPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly visitsService = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateVisit = this.auth.hasOperationClaim(VISITS_CREATE_CLAIM);
    readonly canUpdateVisit = this.auth.hasOperationClaim(VISITS_UPDATE_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(VISITS_CORRECT_CLAIM);
    readonly canCreateExamination = this.auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM);

    readonly loading = signal(true);
    /** İlk yükleme / elle yenileme hatası: listeyi değiştirir. */
    readonly loadError = signal<string | null>(null);
    /** Otomatik yenileme hatası: eski liste kalır, yalnızca uyarı gösterilir. */
    readonly refreshError = signal<string | null>(null);
    readonly today = signal<TodayVm | null>(null);
    readonly groups = computed(() => groupTodayItems(this.today()?.items ?? []));

    /** Bekleme süresini canlı tutan saat (her yenilemede güncellenir). */
    private readonly now = signal(new Date());
    private readonly busyKeys = signal<ReadonlySet<string>>(new Set());

    readonly arrivalOpen = signal(false);
    readonly arrivalAppointment = signal<TodayItemVm | null>(null);
    readonly correctionOpen = signal(false);
    readonly correctionItem = signal<TodayItemVm | null>(null);

    /** `switchMap`: üst üste gelen yenilemelerde yalnızca sonuncunun yanıtı uygulanır. */
    private readonly refresh$ = new Subject<RefreshMode>();

    readonly statusLabel = careStatusLabel;
    readonly statusSeverity = careStatusSeverity;
    readonly actionsOf = todayItemActions;

    ngOnInit(): void {
        this.refresh$
            .pipe(
                switchMap((mode) =>
                    this.visitsService.getToday().pipe(
                        map((today): RefreshResult => ({ mode, today })),
                        catchError((e: unknown) => of({ mode, error: panelHttpFailureMessage(e, 'Bugün listesi yüklenemedi.') }))
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((result) => this.applyResult(result));
        timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.refresh('silent'));
        this.refresh('initial');
    }

    refresh(mode: RefreshMode): void {
        if (mode === 'initial') {
            this.loading.set(true);
        }
        this.refresh$.next(mode);
    }

    time(utc: string | null): string {
        return formatUtcIsoAsLocalTimeDisplay(utc);
    }

    /** Yalnızca açık (bekleyen / devam eden) satırlarda gelişten bu yana geçen süre. */
    elapsed(item: TodayItemVm): string | null {
        return item.careStatus === 'Waiting' || item.careStatus === 'InProgress'
            ? formatElapsedSince(item.arrivedAtUtc, this.now())
            : null;
    }

    isBusy(item: TodayItemVm): boolean {
        return this.busyKeys().has(item.key);
    }

    openWalkInArrival(): void {
        this.arrivalAppointment.set(null);
        this.arrivalOpen.set(true);
    }

    openAppointmentArrival(item: TodayItemVm): void {
        this.arrivalAppointment.set(item);
        this.arrivalOpen.set(true);
    }

    onArrived({ created }: VisitCreateResultVm): void {
        addTracedToast(
            this.messages,
            'TodayPage',
            this.router.url,
            created
                ? { severity: 'success', summary: 'Geliş kaydedildi.', life: 4000 }
                : {
                      severity: 'info',
                      summary: 'Açık geliş kaydı zaten var.',
                      detail: 'Yeni kayıt açılmadı; mevcut kayıt listede.',
                      life: 6000
                  }
        );
        this.refresh('silent');
    }

    openCorrection(item: TodayItemVm): void {
        this.correctionItem.set(item);
        this.correctionOpen.set(true);
    }

    onCorrected(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Düzeltme kaydedildi.', life: 4000 });
        this.refresh('silent');
    }

    /** Hasta tekrar seçilmez: Visit kimliği ve hasta bağlamı muayene çalışma alanına query ile taşınır. */
    openExamination(item: TodayItemVm): void {
        void this.router.navigate(['/panel/examinations/new'], {
            queryParams: { visitId: item.visitId, clientId: item.clientId, petId: item.petId }
        });
    }

    /** Satır kilitliyken ikinci istek gitmez; hatada da liste yenilenir (durum başkası tarafından değişmiş olabilir). */
    transition(item: TodayItemVm, kind: 'start' | 'complete'): void {
        const visitId = item.visitId;
        if (!visitId || this.isBusy(item)) {
            return;
        }
        this.setBusy(item.key, true);
        const call$ = kind === 'start' ? this.visitsService.startVisit(visitId) : this.visitsService.completeVisit(visitId);
        call$.subscribe({
            next: () => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'success',
                    summary: kind === 'start' ? 'Bakım başlatıldı.' : 'Bakım tamamlandı.',
                    life: 3000
                });
                this.refresh('silent');
            },
            error: (e: unknown) => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'error',
                    summary: 'İşlem yapılamadı.',
                    detail: panelHttpFailureMessage(e, 'İşlem yapılamadı.'),
                    life: 6000
                });
                this.refresh('silent');
            }
        });
    }

    private applyResult(result: RefreshResult): void {
        if ('error' in result) {
            if (result.mode === 'initial') {
                this.loadError.set(result.error);
            } else {
                this.refreshError.set('Liste güncellenemedi; son yüklenen veriler gösteriliyor.');
            }
        } else {
            this.today.set(result.today);
            this.loadError.set(null);
            this.refreshError.set(null);
        }
        this.now.set(new Date());
        this.loading.set(false);
    }

    private setBusy(key: string, busy: boolean): void {
        this.busyKeys.update((keys) => {
            const next = new Set(keys);
            if (busy) {
                next.add(key);
            } else {
                next.delete(key);
            }
            return next;
        });
    }
}

type RefreshResult = { mode: RefreshMode; today: TodayVm } | { mode: RefreshMode; error: string };

