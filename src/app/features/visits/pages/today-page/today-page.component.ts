import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, computed, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { EDocumentIssueDialogComponent } from '@/app/entities/e-document/components/e-document-issue-dialog.component';
import type { EDocumentSource } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { VisitCheckoutPanelComponent } from '@/app/features/visits/checkout/components/visit-checkout-panel.component';
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
    EDOCUMENTS_ISSUE_CLAIM,
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
import { AppointmentRequestDetailDialogComponent } from '@/app/entities/online-booking/components/appointment-request-detail-dialog.component';
import { PendingAppointmentRequestsChipComponent } from '@/app/entities/online-booking/components/pending-appointment-requests-chip.component';
import { PendingAppointmentRequestsTilesComponent } from '@/app/entities/online-booking/components/pending-appointment-requests-tiles.component';
import { PendingAppointmentRequestsState } from '@/app/entities/online-booking/services/pending-appointment-requests-state';
import { WaitlistTodaySummaryComponent } from '@/app/entities/waitlist/components/waitlist-today-summary.component';
import { FirstWeekGuideCardComponent } from '@/app/entities/first-week-guide/components/first-week-guide-card.component';
import { TodayMoneyComponent } from '@/app/features/visits/components/today-money.component';
import { TodayOpenItemsComponent } from '@/app/features/visits/components/today-open-items.component';
import { VisitArrivalDialogComponent } from '@/app/entities/visit/components/visit-arrival-dialog.component';
import { VisitCorrectionDialogComponent, type VisitCorrectionTarget } from '@/app/features/visits/components/visit-correction-dialog.component';
import { VisitPreparationDialogComponent } from '@/app/features/visits/components/visit-preparation-dialog.component';
import type { OpenItemVisitVm, TodayItemVm, TodayQuery, TodayVm, VisitCreateResultVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { countWaitingVisits } from '@/app/entities/visit/utils/visit-today.utils';
import {
    formatTodayArrival,
    formatHospitalizationStay,
    groupTodayItems,
    todayHasOpenWork,
    todayItemActions,
    todayNeedsCompletionPrompt,
    todayReasonText,
    todaySecondaryActions,
    todayStatusLabel,
    todayStatusOf,
    type TodayGroup,
    type TodayGroupKey,
    type TodayItemActions,
    type TodaySecondaryAction,
    type TodaySecondaryActionKey,
    type TodayRowPermissions,
    type TodayStatus,
    type TodayStatusTone,
    type WaitAlertLevel,
    isPossiblyForgottenVisit,
    waitAlertLevel,
    waitAlertTitle
} from '@/app/entities/visit/utils/visit-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatTimeDisplay, formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay, formatWeekdayDayMonthDisplay } from '@/app/shared/utils/date.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';
import { readTodayScope, readTodayView, writeTodayScope, writeTodayView, type TodayScope, type TodayView } from '@/app/features/visits/pages/today-page/today-view-preference';

/** Resepsiyon ve hekimin aynı kuyruğu güncel görmesi için otomatik yenileme aralığı. */
const REFRESH_INTERVAL_MS = 30_000;

const COMPACT_MEDIA_QUERY = '(max-width: 40rem)';

type RefreshMode = 'initial' | 'silent';

/** Tamamlanacak geliş: Bugün satırı ya da "Önceki günden açık geliş" listesindeki satır (satır anahtarı = meşgul kilidi). */
type CompletionTarget = Pick<TodayItemVm, 'key' | 'visitId' | 'petId' | 'petName' | 'clientId' | 'latestExaminationId'>;

/** Tek tablonun satırları: grup ara başlığı, kayıt ya da katlanmış tamamlananları açan/kapatan satır. */
type TodayListRow = { kind: 'group'; id: string; group: TodayGroup } | { kind: 'item'; id: string; item: TodayItemVm; groupKey: TodayGroupKey; done: boolean } | { kind: 'toggle'; id: string; hiddenCount: number; expanded: boolean };

interface TodayColumn {
    label: string;
    /** `<col>` ve başlık genişliği; dar kapsayıcıda gizlenen sütunun gövde hücresi de aynı `@max-[…]:hidden` sınıfını taşır. */
    className: string;
}

/** Bitmiş iş: daha alçak, soluk satır (Tamamlandı, Gelmedi, yanlış işaretlenen). */
const DONE_GROUPS: ReadonlySet<TodayGroupKey> = new Set(['completed', 'noShow', 'voided']);

/** Liste başlığındaki sayım sırası (gün akışı: gelecek, klinikte, biten). */
const SUMMARY_ORDER: readonly TodayStatusTone[] = ['planned', 'waiting', 'inProgress', 'completed', 'noShow'];

/**
 * Bugün: o günün randevuları ve gelen hastalar tek kartta, tek tabloda (randevulu Visit tek satır). Ara başlıklar Klinikte, Sıradaki
 * randevular ve Tamamlandı; tamamlananlar katlıdır, işi kalan (ödeme, açık iş) tamamlanmış satır görünür kalır. Satır başına tek birincil
 * adım sağda, "⋯" hemen yanında. Aktif yatışlar ayrı bölümde, klinik geneli açık iş özeti üstte.
 */
@Component({
    selector: 'app-today-page',
    standalone: true,
    imports: [
        CommonModule,
        WaitlistTodaySummaryComponent,
        FirstWeekGuideCardComponent,
        ButtonModule,
        DialogModule,
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
        VisitPreparationDialogComponent,
        AppointmentNoShowDialogComponent,
        PetAlertBadgesComponent,
        PendingAppointmentRequestsChipComponent,
        PendingAppointmentRequestsTilesComponent,
        AppointmentRequestDetailDialogComponent,
        EDocumentIssueDialogComponent,
        DrawerModule,
        VisitCheckoutPanelComponent,
        ReadOnlyReasonDirective,
        MoneyPipe
    ],
    providers: [MessageService, PendingAppointmentRequestsState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './today-page.component.html'
})
export class TodayPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly visitsService = inject(VisitsService);
    private readonly eDocuments = inject(EDocumentsService);
    private readonly cdr = inject(ChangeDetectorRef);
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
    readonly canIssueDocument = this.auth.hasOperationClaim(EDOCUMENTS_ISSUE_CLAIM);
    /** Ziyaret kapanışında belgesiz ücret varsa e-belge önerisi (ADR-036 AK-4 c). */
    documentOpen = false;
    readonly documentSource = signal<EDocumentSource | null>(null);
    /** "Hesabı kapat" (CHECKOUT-001) ön büro işidir: ücrete çevirme ya da tahsilat yetkisi gerekir. */
    readonly canCheckout = this.canCollectPayment || this.canCreateCharge;
    /** Açık "Hesabı kapat" panelinin ziyareti; kapalıyken `null`. */
    readonly checkoutVisitId = signal<string | null>(null);
    private checkoutChanged = false;

    readonly loading = signal(true);
    /** Bekleyen online talepler; Bugün her yenilendiğinde birlikte yenilenir. */
    readonly pendingRequests = inject(PendingAppointmentRequestsState);
    /** Kullanıcı çip görünümünü seçtiyse talepler Açık işler satırında çip (varsayılan: sayfa başında kutucuklar). */
    readonly showPendingChip = computed(() => this.pendingRequests.hasPending() && this.pendingRequests.view() === 'chip');
    /** İlk yükleme / elle yenileme hatası: listeyi değiştirir. */
    readonly loadError = signal<string | null>(null);
    /** Otomatik yenileme hatası: eski liste kalır, yalnızca uyarı gösterilir. */
    readonly refreshError = signal<string | null>(null);
    readonly today = signal<TodayVm | null>(null);
    readonly hospitalizations = computed(() => this.today()?.activeHospitalizations ?? []);
    readonly groups = computed(() => groupTodayItems(this.today()?.items ?? []));
    /** Katlı "Tamamlandı" bölümü açık mı (sayfa açık kaldıkça; otomatik yenileme kapatmaz). */
    readonly showCompleted = signal(false);
    /** Tek tablonun satırları: tamamlananlar katlıyken yalnız işi kalanlar, altında "N tamamlanan kayıt daha göster". */
    readonly rows = computed(() => this.buildRows(this.groups(), this.showCompleted()));
    /** Listede hiçbir satırda sorumlu hekim yoksa Hekim sütunu çizilmez (her satırda "—" yer kaplamasın). */
    readonly hasVet = computed(() => (this.today()?.items ?? []).some((i) => !!i.responsibleVeterinarianName));
    /**
     * Sütun genişlikleri taslak A ile aynı (px): Saat dar, Hasta ve Müşteri geniş, Neden / not kalan yeri alır, İşlem sağa yaslı.
     * Kapsayıcı genişliğine göre (kapsayıcı sorgusu; ekran/yakınlaştırma değil): <72 rem Hekim gizlenir (ad Hasta hücresine iner) ve Hasta /
     * Müşteri esner, <64 rem Neden / not gizlenir (açık iş çipleri Durum hücresine iner), <50 rem düğmeler yalnız simge. Sınıflar tam yazılmalı
     * (Tailwind kaynaktan tarar).
     */
    readonly columns = computed<TodayColumn[]>(() => [
        { label: 'Saat', className: 'w-[80px]' },
        { label: 'Hasta', className: 'w-[220px] @max-[72rem]:w-auto' },
        { label: 'Müşteri', className: 'w-[230px] @max-[72rem]:w-auto' },
        ...(this.hasVet() ? [{ label: 'Hekim', className: 'w-[160px] @max-[72rem]:hidden' }] : []),
        { label: 'Durum', className: 'w-[180px]' },
        { label: 'Neden / not', className: 'w-auto @max-[64rem]:hidden' },
        { label: 'İşlem', className: 'w-[230px] @max-[50rem]:w-[120px]' }
    ]);
    /** Başlığın yanında soluk tarih ve saat ("Çarşamba, 19 Kasım · 15:20"); her yenilemede güncellenir. */
    readonly headerNote = computed(() => `${formatWeekdayDayMonthDisplay(this.now())} · ${formatTimeDisplay(this.now())}`);
    /** Liste başlığındaki sayım ("1 bekleniyor · 2 sırada …"); yalnız günlük listede. */
    readonly summary = computed(() => {
        const counts = new Map<TodayStatusTone, number>();

        for (const i of this.today()?.items ?? []) {
            const tone = todayStatusOf(i, this.now()).tone;

            counts.set(tone, (counts.get(tone) ?? 0) + 1);
        }

        return SUMMARY_ORDER.filter((t) => counts.has(t)).map((tone) => ({ tone, text: `${counts.get(tone)} ${todayStatusLabel(tone).toLocaleLowerCase('tr-TR')}` }));
    });

    /** Bekleme süresini canlı tutan saat (her yenilemede güncellenir). */
    private readonly now = signal(new Date());
    private readonly busyKeys = signal<ReadonlySet<string>>(new Set());

    readonly arrivalOpen = signal(false);
    readonly arrivalAppointment = signal<TodayItemVm | null>(null);
    readonly correctionOpen = signal(false);
    readonly correctionItem = signal<VisitCorrectionTarget | null>(null);
    readonly restoreOpen = signal(false);
    readonly restoreItem = signal<TodayItemVm | null>(null);
    readonly preparationOpen = signal(false);
    readonly preparationItem = signal<TodayItemVm | null>(null);
    private readonly rowMenu = viewChild<Menu>('rowMenu');
    readonly rowMenuItems = signal<MenuItem[]>([]);
    /** Menü kapanış animasyonu bitmeden sayfa değişirse kaplama gövdede asılı kalır; ödeme/ücret sayfasına menü kapandıktan sonra gidilir. */
    /** Muayene ve ücret kaydı olmadan "Tamamla"ya basılan geliş: Muayene aç / Ücret ekle / Ücretsiz tamamla sorulur. */
    readonly completePromptItem = signal<CompletionTarget | null>(null);
    /** "Ücretsiz olarak işaretle" onayı bekleyen tamamlanmış geliş (satır menüsü ya da "Ücret yok" listesi). */
    readonly noChargeConfirm = signal<{ visitId: string; key: string; petName: string } | null>(null);
    private readonly navigateAfterMenu = signal<{ item: TodayItemVm; target: 'payment' | 'charge' | 'appointment' } | null>(null);
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
    readonly view = signal<TodayView>(readTodayView());
    readonly scopeOptions: Array<{ label: string; value: TodayScope }> = [
        { label: 'Benim hastalarım', value: 'mine' },
        { label: 'Tümü', value: 'all' }
    ];
    readonly scope = signal<TodayScope>('all');
    /** Günün iptal edilen randevuları (liste göstermez); klinik geneli sayı olduğu için yalnız günlük listede ve "Tümü"nde yazılır. */
    readonly cancelledAppointments = computed(() => (this.view() === 'today' && this.scope() === 'all' ? (this.today()?.cancelledAppointmentCount ?? 0) : 0));
    /** Giriş yapan kullanıcı aktif klinikte hekimse kimliği; değilse `null` ve kapsam süzgeci görünmez. */
    readonly myUserId = signal<string | null>(null);

    /** `switchMap`: üst üste gelen yenilemelerde yalnızca sonuncunun yanıtı uygulanır. */
    private readonly refresh$ = new Subject<RefreshMode>();

    readonly phone = formatClientPhoneForDisplay;
    readonly actionsOf = (item: TodayItemVm) => todayItemActions(item, this.now());
    readonly reasonOf = todayReasonText;
    readonly waitTitle = waitAlertTitle;
    readonly hasOpenWork = todayHasOpenWork;
    protected readonly carriedOverTitle = 'Önceki günden kalan açık geliş; tamamlayın veya hatalı işaretleyin';
    /** Durum: nokta + tek satır metin; renk her zaman metinle birlikte (yalnız renge güvenilmez). Bekleniyor içi boş halka. */
    readonly statusTextClass: Record<TodayStatusTone, string> = {
        planned: 'text-color',
        waiting: 'text-amber-700 dark:text-amber-300',
        inProgress: 'text-primary',
        completed: 'font-medium! text-green-700 dark:text-green-400',
        noShow: 'font-medium! text-muted-color'
    };
    readonly statusDotClass: Record<TodayStatusTone, string> = {
        planned: 'border-2 border-surface-400 dark:border-surface-500',
        waiting: 'bg-amber-500',
        inProgress: 'bg-primary',
        completed: 'bg-green-500',
        noShow: 'bg-surface-400 dark:bg-surface-500'
    };
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
        // Menü sayacı ilk yanıtı beklesin; aynı `visits/today` isteği açılışta iki kez gitmez.
        this.menuBadgeFeed.claim('waitingVisits');
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

        this.pendingRequests.load();
        this.refresh$.next(mode);
    }

    /** Talep penceresi kapandı; onay randevu oluşturduğu için karar verildiyse günlük liste de yenilenir. */
    onRequestDialogClosed(changed: boolean): void {
        this.pendingRequests.close(false);

        if (changed) {
            this.refresh('silent');
        }
    }

    time(utc: string | null): string {
        return formatUtcIsoAsLocalTimeDisplay(utc);
    }

    arrival(utc: string | null): string {
        return formatTodayArrival(utc, this.now());
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

    statusOf(item: TodayItemVm): TodayStatus {
        return todayStatusOf(item, this.now());
    }

    /** Saat hücresi tek değerdir: randevu saati; randevusuz gelişte geliş saati. */
    mainTime(item: TodayItemVm): string {
        return this.time(item.scheduledAtUtc ?? item.arrivedAtUtc);
    }

    /** Saatin altındaki küçük not: randevusuzsa "randevusuz", klinikteki randevulu hastada "geldi 14:56"; bitmiş işte yok. */
    timeNote(item: TodayItemVm, done: boolean): string | null {
        if (!item.scheduledAtUtc) {
            return item.arrivedAtUtc ? 'randevusuz' : null;
        }

        return item.arrivedAtUtc && !done ? `geldi ${this.arrival(item.arrivedAtUtc)}` : null;
    }

    /** Hekim baş harfleri ("Dr." gibi unvanlar atlanır): "Dr. Ece Yılmaz" → "EY". */
    initials(name: string): string {
        return name
            .split(/\s+/)
            .filter((w) => w && !w.endsWith('.'))
            .slice(0, 2)
            .map((w) => w[0].toLocaleUpperCase('tr-TR'))
            .join('');
    }

    toggleCompleted(): void {
        this.showCompleted.update((v) => !v);
    }

    private buildRows(groups: TodayGroup[], showCompleted: boolean): TodayListRow[] {
        const rows: TodayListRow[] = [];

        for (const group of groups) {
            const done = DONE_GROUPS.has(group.key);
            const collapsible = group.key === 'completed';
            const visible = collapsible && !showCompleted ? group.items.filter(todayHasOpenWork) : group.items;
            const hiddenCount = group.items.length - visible.length;

            rows.push({ kind: 'group', id: `g:${group.key}`, group });
            rows.push(...visible.map((item): TodayListRow => ({ kind: 'item', id: item.key, item, groupKey: group.key, done })));

            if (collapsible && (showCompleted || hiddenCount > 0)) {
                rows.push({ kind: 'toggle', id: 't:completed', hiddenCount, expanded: showCompleted });
            }
        }

        return rows;
    }

    possiblyForgotten(item: TodayItemVm): boolean {
        return isPossiblyForgottenVisit(item, this.now());
    }

    waitAlertOf(item: TodayItemVm): WaitAlertLevel {
        return waitAlertLevel(item, this.now());
    }

    isBusy(item: Pick<TodayItemVm, 'key'>): boolean {
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
                      // Sunucu mevcut gelişin hazırlığını değiştirmez (sözleşme §3); düzeltme satır menüsünden yapılır.
                      detail: this.canUpdateVisit ? 'Yeni kayıt açılmadı; mevcut kayıt listede. Hazırlık değişmedi; gerekirse satırdaki ⋯ → Hazırlığı düzenle.' : 'Yeni kayıt açılmadı; mevcut kayıt listede.',
                      life: 6000
                  }
        );
        this.refresh('silent');
    }

    setScope(scope: TodayScope): void {
        this.scope.set(scope);
        writeTodayScope(scope);
        this.refresh('initial');
    }

    /** Hekimse kayıtlı kapsam, yoksa "Benim hastalarım"; ilk yükleme kapsam belli olunca yapılır (çift istek / yanıp sönme yok). */
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
                this.scope.set(userId ? (readTodayScope() ?? 'mine') : 'all');
                this.refresh('initial');
            });
    }

    private todayQuery(): TodayQuery {
        const mine = this.scope() === 'mine' ? this.myUserId() : null;

        return { voided: this.view() === 'voided', ...(mine ? { responsibleVeterinarianUserId: mine } : {}) };
    }

    setView(view: TodayView): void {
        this.view.set(view);
        writeTodayView(view);
        this.refresh('initial');
    }

    private rowPermissions(): TodayRowPermissions {
        return {
            canUpdateVisit: this.canUpdateVisit,
            canNoShow: this.canNoShow,
            canCorrect: this.canCorrect,
            canCollectPayment: this.canCollectPayment,
            canCreateCharge: this.canCreateCharge,
            canCreateAppointment: this.canCreateAppointment
        };
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
            editPreparation: () => this.openPreparation(item),
            toggleUrgency: () => this.toggleUrgency(item),
            collectPayment: () => this.navigateAfterMenu.set({ item, target: 'payment' }),
            addCharge: () => this.navigateAfterMenu.set({ item, target: 'charge' }),
            markNoCharge: () => item.visitId && this.noChargeConfirm.set({ visitId: item.visitId, key: item.key, petName: item.petName }),
            bookAppointment: () => this.navigateAfterMenu.set({ item, target: 'appointment' })
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

    openPreparation(item: TodayItemVm): void {
        this.preparationItem.set(item);
        this.preparationOpen.set(true);
    }

    onPreparationSaved(): void {
        addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Hazırlık kaydedildi.', life: 4000 });
        this.refresh('silent');
    }

    /** Bugün satırı ya da "Önceki günden açık geliş" listesindeki hiç başlamamış geliş. */
    openCorrection(item: VisitCorrectionTarget): void {
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

    /**
     * Gelişin muayenesi varsa o açılır (aynı gelişe ikinci muayene açılmasın); yoksa yeni muayene: hasta tekrar seçilmez, Visit kimliği ve
     * hasta bağlamı muayene çalışma alanına query ile taşınır.
     */
    openExamination(item: Pick<TodayItemVm, 'visitId' | 'clientId' | 'petId' | 'latestExaminationId'>): void {
        if (item.latestExaminationId) {
            void this.router.navigate(['/panel/examinations', item.latestExaminationId]);

            return;
        }

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
        } else if (pending?.target === 'appointment') {
            this.openNewAppointment(pending.item);
        }
    }

    /** O gelişin ücret bekleyen kalemleri Ücretlendir ekranında süzülü açılır. */
    openPendingCharges(item: TodayItemVm): void {
        void this.router.navigate(['/panel/charges/pending'], { queryParams: { visitId: item.visitId } });
    }

    openCheckout(item: TodayItemVm): void {
        this.checkoutChanged = false;
        this.checkoutVisitId.set(item.visitId);
    }

    /** Panel kapanınca, kayıt yapıldıysa liste sessizce yenilenir (rozet ve kalan güncel olsun). */
    closeCheckout(): void {
        this.checkoutVisitId.set(null);

        if (this.checkoutChanged) {
            this.checkoutChanged = false;
            this.refresh('silent');
        }
    }

    onCheckoutFinished(): void {
        this.checkoutChanged = true;
    }

    /** Müşteri ve (varsa) geliş bağlamı ödeme formuna taşınır; o gelişin açık ücretleri dolu gelir. */
    openPayment(item: TodayItemVm): void {
        void this.router.navigate(['/panel/payments/new'], { queryParams: { clientId: item.clientId, visitId: item.visitId } });
    }

    /** Sonraki randevu: müşteri ve hasta dolu açılır; gün ve ilk boş saat formda önden seçilir. */
    openNewAppointment(item: TodayItemVm): void {
        void this.router.navigate(['/panel/appointments/new'], { queryParams: { clientId: item.clientId, petId: item.petId } });
    }

    /** Müşteri, hasta ve (varsa) geliş bağlamı ücret formuna taşınır; hasta tekrar seçilmez. */
    openCharge(item: Pick<TodayItemVm, 'visitId' | 'clientId' | 'petId'>): void {
        void this.router.navigate(['/panel/charges/new'], { queryParams: { clientId: item.clientId, petId: item.petId, visitId: item.visitId } });
    }

    /**
     * Satır kilitliyken ikinci istek gitmez; hatada da liste yenilenir (durum başkası tarafından değişmiş olabilir). "Muayeneye al"
     * (start) başarılıysa ve kullanıcı muayene yazabiliyorsa muayene formu o gelişle açılır.
     */
    transition(item: TodayItemVm, kind: 'start' | 'complete'): void {
        if (item.visitId && !this.isBusy(item)) {
            this.changeCare(item.visitId, item.key, kind, {}, kind === 'start' && this.canCreateExamination ? () => this.openExamination(item) : undefined);
        }
    }

    /** "Tamamla": muayene ve ücret yoksa önce sorulur, varsa doğrudan tamamlanır. */
    requestComplete(item: TodayItemVm): void {
        if (todayNeedsCompletionPrompt(item)) {
            this.completePromptItem.set(item);

            return;
        }

        this.transition(item, 'complete');
    }

    promptOpenExamination(item: CompletionTarget): void {
        this.completePromptItem.set(null);
        this.openExamination(item);
    }

    promptOpenCharge(item: CompletionTarget): void {
        this.completePromptItem.set(null);
        this.openCharge(item);
    }

    /** Bilinçli ücretsiz kapatma: ziyaret tamamlanır, Açık işler "Ücret yok"a girmez. */
    completeWithoutCharge(item: CompletionTarget): void {
        this.completePromptItem.set(null);

        if (item.visitId && !this.isBusy(item)) {
            this.changeCare(item.visitId, item.key, 'complete', { withoutCharge: true });
        }
    }

    /**
     * "Önceki günden açık geliş" listesindeki devam eden gelişi tamamlar; satırın Tamamla'sıyla aynı akış (satır anahtarı = ziyaret kimliği).
     * Muayenesi yoksa önce aynı soru sorulur (Muayene aç / Ücret ekle / Ücretsiz tamamla).
     */
    completeOpenVisit(row: OpenItemVisitVm): void {
        if (this.busyKeys().has(row.visitId)) {
            return;
        }

        if (!row.latestExaminationId) {
            this.completePromptItem.set({ key: row.visitId, visitId: row.visitId, petId: row.petId, petName: row.petName, clientId: row.clientId, latestExaminationId: null });

            return;
        }

        this.changeCare(row.visitId, row.visitId, 'complete');
    }

    /** "Ücret yok" listesinden: tamamlanmış gelişi ücretsiz olarak işaretlemek için onay sorulur. */
    requestMarkNoCharge(row: OpenItemVisitVm): void {
        this.noChargeConfirm.set({ visitId: row.visitId, key: row.visitId, petName: row.petName });
    }

    /** Tamamlanmış geliş bilinçli ücretsiz işaretlenir (`complete { withoutCharge }`, idempotent); "Ücret yok"tan düşer. */
    confirmMarkNoCharge(): void {
        const target = this.noChargeConfirm();

        this.noChargeConfirm.set(null);

        if (!target || this.busyKeys().has(target.key)) {
            return;
        }

        this.setBusy(target.key, true);
        this.visitsService.completeVisit(target.visitId, { withoutCharge: true }).subscribe({
            next: () => {
                this.setBusy(target.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, { severity: 'success', summary: 'Ücretsiz olarak işaretlendi.', life: 3000 });
                this.refresh('silent');
            },
            error: (e: unknown) => {
                this.setBusy(target.key, false);
                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'error',
                    summary: 'İşaretlenemedi.',
                    detail: panelHttpFailureMessage(e, 'İşaretlenemedi.'),
                    life: 6000
                });
            }
        });
    }

    private changeCare(visitId: string, key: string, kind: 'start' | 'complete', options: { withoutCharge?: boolean } = {}, afterSuccess?: () => void): void {
        this.setBusy(key, true);
        const call$ = kind === 'start' ? this.visitsService.startVisit(visitId) : this.visitsService.completeVisit(visitId, options);

        call$.subscribe({
            next: () => {
                this.setBusy(key, false);

                if (afterSuccess) {
                    // Muayene formuna geçiliyor; bildirim ve yenileme gereksiz.
                    afterSuccess();

                    return;
                }

                addTracedToast(this.messages, 'TodayPage', this.router.url, {
                    severity: 'success',
                    summary: kind === 'start' ? 'Muayeneye alındı.' : options.withoutCharge ? 'Ücretsiz tamamlandı.' : 'Bakım tamamlandı.',
                    life: 3000
                });
                this.refresh('silent');

                if (kind === 'complete' && !options.withoutCharge) {
                    this.suggestDocument(visitId);
                }
            },
            error: (e: unknown) => {
                this.setBusy(key, false);
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

    /** Kapanan ziyaretin belgesiz ücreti varsa ve entegratör bağlıysa belge diyaloğunu açar; aksi hâlde sessiz kalır. */
    private suggestDocument(visitId: string): void {
        if (!this.canIssueDocument) {
            return;
        }

        this.eDocuments.visitCloseSuggestion(visitId).subscribe((source) => {
            if (source) {
                this.documentSource.set(source);
                this.documentOpen = true;
                this.cdr.markForCheck();
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
