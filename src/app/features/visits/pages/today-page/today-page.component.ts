import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { AppointmentNoShowDialogComponent } from '@/app/entities/appointment/components/appointment-no-show-dialog.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_CREATE_CLAIM,
    APPOINTMENTS_NOSHOW_CLAIM,
    CHARGES_CREATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    HOSPITALIZATIONS_READ_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    SALES_CREATE_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_CREATE_CLAIM,
    VISITS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TodayMoneyComponent } from '@/app/features/visits/components/today-money.component';
import { TodayOpenItemsComponent } from '@/app/features/visits/components/today-open-items.component';
import { VisitArrivalDialogComponent } from '@/app/entities/visit/components/visit-arrival-dialog.component';
import { VisitCorrectionDialogComponent } from '@/app/features/visits/components/visit-correction-dialog.component';
import type { TodayItemVm, TodayQuery, TodayVm, VisitCreateResultVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { countWaitingVisits } from '@/app/entities/visit/utils/visit-today.utils';
import {
    careStatusLabel,
    careStatusSeverity,
    formatElapsedSince,
    formatHospitalizationStay,
    groupTodayItems,
    todayItemActions,
    todaySecondaryActions,
    todayUrgencyToggle,
    type TodayItemActions,
    type TodaySecondaryAction,
    type TodaySecondaryActionKey,
    type TodayRowPermissions,
    type TodayUrgencyToggle,
    type WaitAlertLevel,
    isPossiblyForgottenVisit,
    waitAlertLevel,
    waitAlertTitle
} from '@/app/entities/visit/utils/visit-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/** Resepsiyon ve hekimin aynı kuyruğu güncel görmesi için otomatik yenileme aralığı. */
const REFRESH_INTERVAL_MS = 30_000;

const COMPACT_MEDIA_QUERY = '(max-width: 40rem)';

type RefreshMode = 'initial' | 'silent';
type TodayView = 'today' | 'voided';
type TodayScope = 'mine' | 'all';

/**
 * Bugün: o günün randevuları ve gelen hastalar tek listede (randevulu Visit tek satır).
 * Ödeme, lab ve yatış rozetleri bakım durumundan ayrıdır (hesaplanan açık iş çipleri); aktif yatışlar ayrı bölümde, klinik geneli açık iş özeti üstte.
 */
@Component({
    selector: 'app-today-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        FormsModule,
        SelectButtonModule,
        MenuModule,
        RouterLink,
        TableModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        TodayMoneyComponent,
        TodayOpenItemsComponent,
        VisitArrivalDialogComponent,
        VisitCorrectionDialogComponent,
        AppointmentNoShowDialogComponent,
        PetAlertBadgesComponent
    ],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './today-page.component.html'
})
export class TodayPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly visitsService = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly menuBadgeFeed = inject(MenuBadgeFeed);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Dar ekranda (<= 40rem) satırlar tablo yerine kart olarak gösterilir. */
    readonly compact = signal(false);

    readonly canCreateVisit = this.auth.hasOperationClaim(VISITS_CREATE_CLAIM);
    readonly canQuickSell = this.auth.hasOperationClaim(SALES_CREATE_CLAIM);
    readonly canCreateAppointment = this.auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM);
    readonly canUpdateVisit = this.auth.hasOperationClaim(VISITS_UPDATE_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(VISITS_CORRECT_CLAIM);
    readonly canNoShow = this.auth.hasOperationClaim(APPOINTMENTS_NOSHOW_CLAIM);
    readonly canReadHospitalization = this.auth.hasOperationClaim(HOSPITALIZATIONS_READ_CLAIM);
    readonly canCreateExamination = this.auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM);
    readonly canCollectPayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    readonly canCreateCharge = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);

    readonly loading = signal(true);
    /** İlk yükleme / elle yenileme hatası: listeyi değiştirir. */
    readonly loadError = signal<string | null>(null);
    /** Otomatik yenileme hatası: eski liste kalır, yalnızca uyarı gösterilir. */
    readonly refreshError = signal<string | null>(null);
    readonly today = signal<TodayVm | null>(null);
    readonly hospitalizations = computed(() => this.today()?.activeHospitalizations ?? []);
    readonly groups = computed(() => groupTodayItems(this.today()?.items ?? []));

    /** Bekleme süresini canlı tutan saat (her yenilemede güncellenir). */
    private readonly now = signal(new Date());
    private readonly busyKeys = signal<ReadonlySet<string>>(new Set());

    readonly arrivalOpen = signal(false);
    readonly arrivalAppointment = signal<TodayItemVm | null>(null);
    readonly correctionOpen = signal(false);
    readonly correctionItem = signal<TodayItemVm | null>(null);
    readonly restoreOpen = signal(false);
    readonly restoreItem = signal<TodayItemVm | null>(null);
    private readonly rowMenu = viewChild<Menu>('rowMenu');
    readonly rowMenuItems = signal<MenuItem[]>([]);
    /** Menü kapanış animasyonu bitmeden sayfa değişirse kaplama gövdede asılı kalır; ödeme/ücret sayfasına menü kapandıktan sonra gidilir. */
    private readonly navigateAfterMenu = signal<{ item: TodayItemVm; target: 'payment' | 'charge' } | null>(null);
    readonly noShowOpen = signal(false);
    readonly noShowItem = signal<TodayItemVm | null>(null);
    readonly noShowMode = signal<'mark' | 'revert'>('mark');
    readonly noShowSubject = computed(() => {
        const i = this.noShowItem();

        return i ? `${i.petName} · ${i.clientName} · Randevu ${this.time(i.scheduledAtUtc)}` : '';
    });

    readonly viewOptions: Array<{ label: string; value: TodayView }> = [
        { label: 'Günlük liste', value: 'today' },
        { label: 'Yanlış işaretlenenler', value: 'voided' }
    ];
    readonly view = signal<TodayView>('today');
    readonly scopeOptions: Array<{ label: string; value: TodayScope }> = [
        { label: 'Benim hastalarım', value: 'mine' },
        { label: 'Tümü', value: 'all' }
    ];
    readonly scope = signal<TodayScope>('all');
    /** Giriş yapan kullanıcı aktif klinikte hekimse kimliği; değilse `null` ve kapsam süzgeci görünmez. */
    readonly myUserId = signal<string | null>(null);

    /** `switchMap`: üst üste gelen yenilemelerde yalnızca sonuncunun yanıtı uygulanır. */
    private readonly refresh$ = new Subject<RefreshMode>();

    readonly statusLabel = careStatusLabel;
    readonly statusSeverity = careStatusSeverity;
    readonly phone = formatClientPhoneForDisplay;
    readonly actionsOf = (item: TodayItemVm) => todayItemActions(item, this.now());
    readonly waitTitle = waitAlertTitle;
    /**
     * Tüm grup tabloları aynı sütun şablonunu kullanır (hizalı başlıklar): Saat, Hasta, Sahip, Hekim, Durum, Ödeme/yatış, Süre, Eylemler.
     * Üç kip, tablo kapsayıcısının genişliğine göre (kapsayıcı sorgusu; ekran/yakınlaştırma değil):
     * geniş (≥72 rem): tüm sütunlar, yazılı düğmeler; orta (50–72 rem): Hekim ve Ödeme/yatış sütunları gizlenir (bilgi Hasta ve Durum
     * hücrelerine taşınır), düğmeler yine yazılı; dar (<50 rem): düğmeler yalnız ikon (aria-label + ipucu). Hasta/Sahip adı en çok 2 satıra
     * sarar (tam ad ipucunda); Sahip kalan genişliği alır, telefon tek satır; tablo yatay taşmaz. Sınıflar tam yazılmalı (Tailwind kaynaktan tarar).
     */
    protected readonly columnClasses = ['w-[6rem]', 'w-[9rem]', 'w-auto', 'w-[7rem] @max-[76rem]:hidden', 'w-[8.5rem] @max-[76rem]:w-[9rem]', 'w-[11rem] @max-[76rem]:hidden', 'w-[7.5rem]', 'w-[20rem] @max-[50rem]:w-[12rem]'];
    protected readonly carriedOverTitle = 'Önceki günden kalan açık geliş; tamamlayın veya hatalı işaretleyin';
    readonly waitAlertClass: Record<WaitAlertLevel, string> = {
        none: '',
        warning: 'font-semibold text-orange-600 dark:text-orange-400',
        critical: 'font-semibold text-red-600 dark:text-red-400'
    };
    readonly waitAlertIcon: Record<WaitAlertLevel, string> = {
        none: '',
        warning: 'pi-clock',
        critical: 'pi-exclamation-triangle'
    };

    ngOnInit(): void {
        this.watchCompactViewport();
        this.refresh$
            .pipe(
                switchMap((mode) =>
                    this.visitsService.getToday(this.todayQuery()).pipe(
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
        this.destroyRef.onDestroy(() => this.menuBadgeFeed.release('waitingVisits'));
        this.startWithScope();
    }

    private watchCompactViewport(): void {
        const query = window.matchMedia(COMPACT_MEDIA_QUERY);
        const update = () => this.compact.set(query.matches);

        update();
        query.addEventListener('change', update);
        this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
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

    date(utc: string | null): string {
        return formatUtcIsoAsLocalDateDisplay(utc);
    }

    admittedAt(utc: string): string {
        return `${this.date(utc)} ${this.time(utc)}`;
    }

    stay(admittedAtUtc: string): string | null {
        return formatHospitalizationStay(admittedAtUtc, this.now());
    }

    /** Yalnızca açık (bekleyen / devam eden) satırlarda gelişten bu yana geçen süre. */
    elapsed(item: TodayItemVm): string | null {
        return item.careStatus === 'Waiting' || item.careStatus === 'InProgress' ? formatElapsedSince(item.arrivedAtUtc, this.now()) : null;
    }

    possiblyForgotten(item: TodayItemVm): boolean {
        return isPossiblyForgottenVisit(item, this.now());
    }

    waitAlertOf(item: TodayItemVm): WaitAlertLevel {
        return waitAlertLevel(item, this.now());
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

    setScope(scope: TodayScope): void {
        this.scope.set(scope);
        this.refresh('initial');
    }

    /** Hekimse varsayılan "Benim hastalarım"; ilk yükleme kapsam belli olunca yapılır (çift istek / yanıp sönme yok). */
    private startWithScope(): void {
        if (!this.canCreateVisit) {
            this.refresh('initial');

            return;
        }

        this.visitsService
            .getCurrentVeterinarianUserId()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((userId) => {
                this.myUserId.set(userId);
                this.scope.set(userId ? 'mine' : 'all');
                this.refresh('initial');
            });
    }

    private todayQuery(): TodayQuery {
        const mine = this.scope() === 'mine' ? this.myUserId() : null;

        return { voided: this.view() === 'voided', ...(mine ? { responsibleVeterinarianUserId: mine } : {}) };
    }

    setView(view: TodayView): void {
        this.view.set(view);
        this.refresh('initial');
    }

    private rowPermissions(): TodayRowPermissions {
        return {
            canUpdateVisit: this.canUpdateVisit,
            canNoShow: this.canNoShow,
            canCorrect: this.canCorrect,
            canCollectPayment: this.canCollectPayment,
            canCreateCharge: this.canCreateCharge
        };
    }

    urgencyToggleOf(item: TodayItemVm, actions: TodayItemActions): TodayUrgencyToggle | null {
        return todayUrgencyToggle(item, actions, this.rowPermissions());
    }

    secondaryActionsOf(item: TodayItemVm, actions: TodayItemActions): TodaySecondaryAction[] {
        return todaySecondaryActions(item, actions, this.rowPermissions());
    }

    /** Seyrek/düzeltme eylemleri tek "⋯" menüsünde; PrimeNG popup menü klavye ile açılır/gezilir. */
    openRowMenu(event: Event, item: TodayItemVm, actions: TodaySecondaryAction[]): void {
        const handlers: Record<TodaySecondaryActionKey, () => void> = {
            markNoShow: () => this.openNoShow(item, 'mark'),
            revertNoShow: () => this.openNoShow(item, 'revert'),
            restore: () => this.openRestore(item),
            correct: () => this.openCorrection(item),
            collectPayment: () => this.navigateAfterMenu.set({ item, target: 'payment' }),
            addCharge: () => this.navigateAfterMenu.set({ item, target: 'charge' })
        };
        const blocked = this.ro.mutationBlocked() || this.isBusy(item);

        this.rowMenuItems.set(actions.map((a) => ({ label: a.label, icon: a.icon, disabled: blocked, command: handlers[a.key] })));
        this.rowMenu()?.toggle(event);
    }
    openNoShow(item: TodayItemVm, mode: 'mark' | 'revert'): void {
        this.noShowItem.set(item);
        this.noShowMode.set(mode);
        this.noShowOpen.set(true);
    }

    onNoShowDone(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, {
            severity: 'success',
            summary: this.noShowMode() === 'mark' ? 'Randevu gelmedi olarak işaretlendi.' : 'Gelmedi işareti geri alındı.',
            life: 4000
        });
        this.refresh('silent');
    }

    openRestore(item: TodayItemVm): void {
        this.restoreItem.set(item);
        this.restoreOpen.set(true);
    }

    onRestored(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Geliş geri alındı.', life: 4000 });
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

    /** Sıralamayı sunucu belirler: istemci yeniden sıralamaz, yalnızca yeniler. Hatada da yenilenir. */
    toggleUrgency(item: TodayItemVm): void {
        const visitId = item.visitId;

        if (!visitId || this.isBusy(item)) {
            return;
        }

        this.setBusy(item.key, true);
        this.visitsService.setUrgency(visitId, !item.isUrgent).subscribe({
            next: () => {
                this.setBusy(item.key, false);
                this.refresh('silent');
            },
            error: (e: unknown) => {
                this.setBusy(item.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'error',
                    summary: 'Acil işareti güncellenemedi.',
                    detail: panelHttpFailureMessage(e, 'Acil işareti güncellenemedi.'),
                    life: 6000
                });
                this.refresh('silent');
            }
        });
    }

    /** Hasta tekrar seçilmez: Visit kimliği ve hasta bağlamı muayene çalışma alanına query ile taşınır. */
    openExamination(item: TodayItemVm): void {
        void this.router.navigate(['/panel/examinations/new'], {
            queryParams: { visitId: item.visitId, clientId: item.clientId, petId: item.petId }
        });
    }

    /** Menü kapandıktan sonra bekleyen geçiş (ödeme ya da ücret formu) bir kez yapılır. */
    openPendingNavigation(): void {
        const pending = this.navigateAfterMenu();

        this.navigateAfterMenu.set(null);

        if (pending?.target === 'payment') {
            this.openPayment(pending.item);
        } else if (pending?.target === 'charge') {
            this.openCharge(pending.item);
        }
    }

    /** O gelişin ücret bekleyen kalemleri Ücretlendir ekranında süzülü açılır. */
    openPendingCharges(item: TodayItemVm): void {
        void this.router.navigate(['/panel/charges/pending'], { queryParams: { visitId: item.visitId } });
    }

    /** Müşteri ve (varsa) geliş bağlamı ödeme formuna taşınır; o gelişin açık ücretleri dolu gelir. */
    openPayment(item: TodayItemVm): void {
        void this.router.navigate(['/panel/payments/new'], { queryParams: { clientId: item.clientId, visitId: item.visitId } });
    }

    /** Müşteri, hasta ve (varsa) geliş bağlamı ücret formuna taşınır; hasta tekrar seçilmez. */
    openCharge(item: TodayItemVm): void {
        void this.router.navigate(['/panel/charges/new'], { queryParams: { clientId: item.clientId, petId: item.petId, visitId: item.visitId } });
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
            this.feedMenuBadge(result.today);
        }

        this.now.set(new Date());
        this.loading.set(false);
    }

    /** Filtresiz kuyruk menüdeki bekleyen sayacıyla aynı veridir; menü ikinci kez sorgulamasın diye sayı bildirilir. */
    private feedMenuBadge(today: TodayVm): void {
        const query = this.todayQuery();

        if (!query.voided && !query.responsibleVeterinarianUserId) {
            this.menuBadgeFeed.report('waitingVisits', countWaitingVisits(today));
        } else {
            this.menuBadgeFeed.release('waitingVisits');
        }
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
