import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { PaginatorState } from 'primeng/types/paginator';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapMyClinicsToSelectOptions } from '@/app/features/reports/shared/map-my-clinics-to-select-options';
import { isReportUiClinicIdMisalignedWithJwt, isReportUiClinicIdUnknownToMyClinics } from '@/app/features/reports/shared/report-my-clinic.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { isReportRecoverableClinicConstraint403, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import {
    dateOnlyInputToIstanbulEndUtcIso,
    dateOnlyInputToIstanbulStartUtcIso,
    localDateYyyyMmDd
} from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

/** Dört rapor sorgusunun ortak alanları; rapora özgü tek süzgeç (`method` / `status`) dizin imzasıyla eklenir. */
export interface ReportListQueryBase {
    page?: number;
    pageSize?: number;
    search?: string;
    from?: string;
    to?: string;
    clinicId?: string;
    clientId?: string;
    petId?: string;
    /** Kayıt defterlerine özgü süzgeçler (`extraKeys`); değerler metin olarak gider (`includeVoided`: `true`). */
    includeVoided?: string;
    productId?: string;
    veterinarianId?: string;
    /** HBS takip listelerine özgü (`NotEntered` | `Entered` | `NotRequired`; boş = Girilmedi). */
    hbsStatus?: string;
    /** Gün sonu dökümüne özgü süzgeçler (`extraKeys`). */
    kind?: string;
    paymentMethod?: string;
    performedByUserId?: string;
}

/** `ReportListConfig.extraKeys` ile yönetilen rapora özgü ek süzgeçlerin adları (kayıt defterleri, gün sonu dökümü). */
export type ReportExtraKey = 'includeVoided' | 'productId' | 'veterinarianId' | 'hbsStatus' | 'kind' | 'paymentMethod' | 'performedByUserId';

export interface ReportListResultBase {
    readonly page: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly items: readonly unknown[];
}

export interface ReportListSource<Q, R> {
    loadReport(query: Q): Observable<R>;
    exportCsvBlob(query: Q): Observable<HttpResponse<Blob>>;
    exportXlsxBlob(query: Q): Observable<HttpResponse<Blob>>;
}

export interface ReportListConfig<Q, R> {
    source: ReportListSource<Q, R>;
    /** `sessionStorage` anahtarı: süzgeç ve sayfa konumu sayfadan çıkıp dönünce korunur. */
    stateKey: string;
    /** Dışa aktarma bu izne bağlıdır (rapor erişimiyle aynı); dizi verilirse hepsi birlikte gerekir. */
    readClaim: string | readonly string[];
    /** Content-Disposition yoksa dosya adı: `<önek>-<tarih>.csv|xlsx`. */
    exportFilePrefix: string;
    /** Rapora özgü tek süzgeç (ödeme: `method`, randevu ve aşı: `status`, borç: `minAmount`). */
    extraFilterKey?: 'method' | 'status' | 'minAmount';
    /** "Şu anki" durum raporu: tarih aralığı, müşteri ve hayvan süzgeci yoktur (borç raporu). */
    snapshot?: boolean;
    /** Kayıt defterleri: yalnız tarih aralığı + klinik süzgeci; `from`/`to` takvim günü (`yyyy-MM-dd`) olarak gider, arama/müşteri/hayvan yoktur. */
    dateRangeOnly?: boolean;
    /** Rapora özgü ek süzgeçler (birden çok olabilir); `extraInputs` / `activeExtras` ile yönetilir. */
    extraKeys?: readonly ReportExtraKey[];
    /** Varsayılan dönem yalnız bugündür (gün sonu); yoksa ayın başından bugüne. */
    todayOnlyByDefault?: boolean;
    /** Sayfa boyutu seçenekleri (varsayılan 10-50). */
    rowsPerPageOptions?: number[];
}

type ExportKind = 'csv' | 'xlsx';

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 20, 25, 50];

const safeTrim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Rapor listesi sayfalarının ortak durumu ve akışı: tarih aralığı, klinik süzgeci, sayfalama, önbellek anahtarı, yarış koruması,
 * oturumda saklama ve CSV/XLSX dışa aktarma. Liste ve dışa aktarma aynı sorgu nesnesinden (`buildQuery`) üretilir.
 * Enjeksiyon bağlamında (bileşen alan başlatıcısı) oluşturulmalıdır.
 */
export class ReportListState<Q extends ReportListQueryBase, R extends ReportListResultBase> {
    private readonly auth = inject(AuthService);
    readonly scheduleApply = debouncedAction(() => this.applyFilters());

    readonly canExport = computed(() => [this.config.readClaim].flat().every((c) => this.auth.hasOperationClaim(c)));
    /** Dışa aktarma yalnız yüklü, hatasız ve dolu bir sonuç varken anlamlıdır. */
    readonly hasExportableRows = computed(() => !this.loading() && !this.error() && (this.report()?.items.length ?? 0) > 0);

    readonly loading = signal(true);
    readonly exportKind = signal<ExportKind | null>(null);
    readonly error = signal<string | null>(null);
    /** Hata istek içeriğinden (400/422: ör. tarih aralığı çok geniş) kaynaklı: aynı istekle tekrar denemek işe yaramaz. */
    readonly errorIsInvalidInput = signal(false);
    readonly exportError = signal<string | null>(null);
    readonly dateFilterError = signal<string | null>(null);
    readonly report = signal<R | null>(null);

    readonly pageSize = signal(25);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeExtra = signal('');
    readonly activeClinicId = signal('');
    readonly activeClientId = signal('');
    readonly activePetId = signal('');
    readonly activeExtras = signal<Readonly<Record<string, string>>>({});

    fromDateInput = '';
    toDateInput = '';
    searchInput = '';
    extraFilter = '';
    clinicIdFilter = '';
    clientIdFilter = '';
    petIdFilter = '';
    extraInputs: Record<string, string> = {};

    readonly clinicOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.reportsClinicPanelDefault, value: '' }]);

    private suppressNextLazy = false;
    private lastLoadKey = '';
    private clinicSummariesLoadedOk = false;
    private latestReportLoadSeq = 0;

    constructor(private readonly config: ReportListConfig<Q, R>) {}

    get snapshot(): boolean {
        return !!this.config.snapshot;
    }

    get dateRangeOnly(): boolean {
        return !!this.config.dateRangeOnly;
    }

    get rowsPerPageOptions(): number[] {
        return this.config.rowsPerPageOptions ?? DEFAULT_ROWS_PER_PAGE_OPTIONS;
    }

    exporting(): boolean {
        return this.exportKind() !== null;
    }

    isExporting(kind: ExportKind): boolean {
        return this.exportKind() === kind;
    }

    init(): void {
        const restored = this.restoreStateFromSessionStorage();

        if (!restored) {
            this.bootstrapDefaultDates();
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.currentPage.set(1);
            this.first.set(0);
        }

        this.suppressNextLazy = true;
        this.bootstrapReportAfterMyClinics();
    }

    onClientFilterChange(clientId: string | null): void {
        this.clientIdFilter = clientId ?? '';
        this.petIdFilter = '';
        this.scheduleApply();
    }

    applyFilters(): void {
        this.dateFilterError.set(null);

        let from = safeTrim(this.fromDateInput);
        let to = safeTrim(this.toDateInput);

        // Backend sözleşmesi: from/to zorunlu. UI'de iki tarih birlikte seçilir.
        if ((from && !to) || (!from && to)) {
            this.dateFilterError.set(PANEL_COPY.reportsDateRangeBothRequired);

            return;
        }

        if (!from && !to) {
            this.bootstrapDefaultDates();
            from = safeTrim(this.fromDateInput);
            to = safeTrim(this.toDateInput);
        }

        if (from && to && from > to) {
            const t = from;

            from = to;
            to = t;
            this.fromDateInput = from;
            this.toDateInput = to;
        }

        this.activeSearch.set(safeTrim(this.searchInput));
        this.activeFromDate.set(from);
        this.activeToDate.set(to);
        this.activeExtra.set(safeTrim(this.extraFilter));
        this.activeClinicId.set(safeTrim(this.clinicIdFilter));
        this.activeClientId.set(safeTrim(this.clientIdFilter));
        this.activePetId.set(safeTrim(this.petIdFilter));
        this.activeExtras.set(this.trimmedExtraInputs());
        this.stripJwtMisalignedReportClinicIfNeeded();
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize());
    }

    resetFilters(): void {
        this.dateFilterError.set(null);
        this.searchInput = '';
        this.extraFilter = '';
        this.clinicIdFilter = '';
        this.clientIdFilter = '';
        this.petIdFilter = '';
        this.extraInputs = {};
        this.activeExtras.set({});
        this.activeSearch.set('');
        this.activeExtra.set('');
        this.activeClinicId.set('');
        this.activeClientId.set('');
        this.activePetId.set('');
        this.bootstrapDefaultDates();
        this.activeFromDate.set(this.fromDateInput.trim());
        this.activeToDate.set(this.toDateInput.trim());
        this.first.set(0);
        this.currentPage.set(1);
        sessionStorage.removeItem(this.config.stateKey);
        this.loadFromServer(1, this.pageSize());
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;

            return;
        }

        this.changePage(event.first ?? 0, event.rows ?? this.pageSize());
    }

    onMobilePageChange(state: PaginatorState): void {
        this.suppressNextLazy = true;
        this.changePage(state.first ?? 0, state.rows ?? this.pageSize());
    }

    exportCsv(): void {
        this.export('csv');
    }

    exportXlsx(): void {
        this.export('xlsx');
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    isExtraActive(): boolean {
        return !!this.activeExtra().trim();
    }

    isClinicActive(): boolean {
        return !!this.activeClinicId().trim();
    }

    isClientFilterActive(): boolean {
        return !!this.activeClientId().trim();
    }

    isPetFilterActive(): boolean {
        return !!this.activePetId().trim();
    }

    private trimmedExtraInputs(): Record<string, string> {
        return Object.fromEntries((this.config.extraKeys ?? []).map((key) => [key, safeTrim(this.extraInputs[key])]));
    }

    private changePage(eventFirst: number, rows: number): void {
        if (rows !== this.pageSize()) {
            this.first.set(0);
            this.currentPage.set(1);
            this.persistStateToSessionStorage(1, rows);
            this.loadFromServer(1, rows);

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows);
    }

    private export(kind: ExportKind): void {
        if (!this.canExport()) {
            return;
        }

        const { source, exportFilePrefix } = this.config;

        this.exportError.set(null);
        this.exportKind.set(kind);
        this.sanitizeExportClinicFilterIfStale();
        const q = this.buildQuery(1, this.pageSize());
        const req$ = kind === 'xlsx' ? source.exportXlsxBlob(q) : source.exportCsvBlob(q);

        req$.subscribe({
            next: (res) => {
                this.exportKind.set(null);
                this.exportError.set(null);
                const blob = res.body;

                if (!blob) {
                    this.exportError.set(PANEL_COPY.reportsExportResponseEmpty);

                    return;
                }

                const fromCd = fileNameFromContentDisposition(res.headers.get('Content-Disposition'));

                triggerBlobDownload(blob, fromCd ?? `${exportFilePrefix}-${localDateYyyyMmDd()}.${kind}`);
            },
            error: (e: Error) => {
                this.exportKind.set(null);
                this.exportError.set(e.message?.trim() || PANEL_COPY.reportsExportFailedFallback);
            }
        });
    }

    private bootstrapDefaultDates(): void {
        if (this.snapshot) {
            return;
        }

        this.toDateInput = localDateYyyyMmDd();
        this.fromDateInput = this.config.todayOnlyByDefault ? this.toDateInput : defaultReportFromYyyyMmDd();
    }

    private bootstrapReportAfterMyClinics(): void {
        this.auth.getMyClinics().subscribe({
            next: (list: ClinicSummary[]) => {
                this.clinicSummariesLoadedOk = true;
                this.clinicOptions.set(mapMyClinicsToSelectOptions(list, PANEL_COPY.reportsClinicPanelDefault));
                const stale = this.clearStaleRestoredClinicIfNeeded(list);

                if (stale) {
                    this.suppressNextLazy = true;
                    this.loadFromServer(1, this.pageSize(), true);
                } else {
                    this.loadFromServer(this.currentPage(), this.pageSize());
                }
            },
            error: () => {
                this.clinicSummariesLoadedOk = false;
                this.clinicOptions.set([{ label: PANEL_COPY.reportsClinicPanelDefault, value: '' }]);
                this.loadFromServer(this.currentPage(), this.pageSize());
            }
        });
    }

    private clearStaleRestoredClinicIfNeeded(summaries: ClinicSummary[]): boolean {
        const id = this.activeClinicId().trim();

        if (!id) {
            return false;
        }

        const jwtClinic = this.auth.getJwtClinicId();

        if (isReportUiClinicIdUnknownToMyClinics(id, summaries) || isReportUiClinicIdMisalignedWithJwt(id, jwtClinic)) {
            this.clearStaleUiClinicFilterSilently();

            return true;
        }

        return false;
    }

    /** JWT ile uyumsuz rapor filtresini sayfa konumunu koruyarak kaldırır (sayfalama / lazy load). */
    private clearJwtMisalignedUiClinicOnly(): void {
        this.clinicIdFilter = '';
        this.activeClinicId.set('');
        this.persistStateToSessionStorage(this.currentPage(), this.pageSize());
    }

    private stripJwtMisalignedReportClinicIfNeeded(): void {
        const id = this.activeClinicId().trim();

        if (!id) {
            return;
        }

        if (isReportUiClinicIdMisalignedWithJwt(id, this.auth.getJwtClinicId())) {
            this.clearJwtMisalignedUiClinicOnly();
        }
    }

    private clearStaleUiClinicFilterSilently(): void {
        this.clinicIdFilter = '';
        this.activeClinicId.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
    }

    private sanitizeExportClinicFilterIfStale(): void {
        if (!this.clinicSummariesLoadedOk) {
            return;
        }

        const id = this.activeClinicId().trim();

        if (!id) {
            return;
        }

        if (!this.clinicOptions().some((o) => o.value === id)) {
            this.clearStaleUiClinicFilterSilently();

            return;
        }

        if (isReportUiClinicIdMisalignedWithJwt(id, this.auth.getJwtClinicId())) {
            this.clearJwtMisalignedUiClinicOnly();
        }
    }

    private buildQuery(page: number, pageSize: number): Q {
        const fromYmd = this.activeFromDate().trim();
        const toYmd = this.activeToDate().trim();
        const extraKey = this.config.extraFilterKey;
        const dayOnly = this.config.dateRangeOnly;

        return {
            page,
            pageSize,
            search: this.activeSearch() || undefined,
            from: (dayOnly ? fromYmd : fromYmd ? dateOnlyInputToIstanbulStartUtcIso(fromYmd) : '') || undefined,
            to: (dayOnly ? toYmd : toYmd ? dateOnlyInputToIstanbulEndUtcIso(toYmd) : '') || undefined,
            ...(extraKey ? { [extraKey]: this.activeExtra() || undefined } : {}),
            clinicId: this.activeClinicId().trim() || undefined,
            clientId: this.activeClientId().trim() || undefined,
            petId: this.activePetId().trim() || undefined,
            ...Object.fromEntries((this.config.extraKeys ?? []).map((key) => [key, this.activeExtras()[key] || undefined]))
        } as Q;
    }

    private loadFromServer(page: number, pageSize: number, force = false): void {
        this.stripJwtMisalignedReportClinicIfNeeded();
        const q = this.buildQuery(page, pageSize);
        const explicitQueryClinicId = !!q.clinicId;
        const requestKey = JSON.stringify(q);

        if (!force && requestKey === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = requestKey;
        const seq = ++this.latestReportLoadSeq;

        this.loading.set(true);
        this.error.set(null);
        this.errorIsInvalidInput.set(false);
        this.config.source.loadReport(q).subscribe({
            next: (r) => {
                if (seq !== this.latestReportLoadSeq) {
                    return;
                }

                this.report.set(r);
                this.pageSize.set(r.pageSize);
                this.currentPage.set(r.page);
                this.first.set((r.page - 1) * r.pageSize);
                this.persistStateToSessionStorage(r.page, r.pageSize);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                if (seq !== this.latestReportLoadSeq) {
                    return;
                }

                if (err instanceof HttpErrorResponse && explicitQueryClinicId && isReportRecoverableClinicConstraint403(err)) {
                    this.lastLoadKey = '';
                    this.clearStaleUiClinicFilterSilently();
                    this.suppressNextLazy = true;
                    this.loadFromServer(1, this.pageSize(), true);

                    return;
                }

                this.error.set(panelHttpFailureMessage(err, PANEL_COPY.reportsLoadErrorFallback));
                this.errorIsInvalidInput.set(err instanceof HttpErrorResponse && (err.status === 400 || err.status === 422));
                this.loading.set(false);
            }
        });
    }

    private restoreStateFromSessionStorage(): boolean {
        const { stateKey, extraFilterKey } = this.config;
        const raw = sessionStorage.getItem(stateKey);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const page = Number(parsed['page']);
            const pageSize = Number(parsed['pageSize']);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(stateKey);

                return false;
            }

            this.searchInput = safeTrim(parsed['search']);
            this.fromDateInput = safeTrim(parsed['fromDate']);
            this.toDateInput = safeTrim(parsed['toDate']);
            this.extraFilter = extraFilterKey ? safeTrim(parsed[extraFilterKey]) : '';
            this.clinicIdFilter = safeTrim(parsed['clinicId']);
            this.clientIdFilter = safeTrim(parsed['clientId']);
            this.petIdFilter = safeTrim(parsed['petId']);
            this.extraInputs = Object.fromEntries((this.config.extraKeys ?? []).map((key) => [key, safeTrim(parsed[key])]));

            // Tarihler restore'da tek taraflı geldiyse varsayılan döneme dön.
            const from = safeTrim(this.fromDateInput);
            const to = safeTrim(this.toDateInput);

            if ((from && !to) || (!from && to)) {
                this.bootstrapDefaultDates();
            }

            this.activeSearch.set(this.searchInput);
            this.activeFromDate.set(this.fromDateInput);
            this.activeToDate.set(this.toDateInput);
            this.activeExtra.set(this.extraFilter);
            this.activeClinicId.set(this.clinicIdFilter);
            this.activeClientId.set(this.clientIdFilter);
            this.activePetId.set(this.petIdFilter);
            this.activeExtras.set(this.trimmedExtraInputs());
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(stateKey);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const { stateKey, extraFilterKey } = this.config;

        sessionStorage.setItem(
            stateKey,
            JSON.stringify({
                search: safeTrim(this.searchInput),
                fromDate: safeTrim(this.fromDateInput),
                toDate: safeTrim(this.toDateInput),
                ...(extraFilterKey ? { [extraFilterKey]: safeTrim(this.extraFilter) } : {}),
                clinicId: safeTrim(this.clinicIdFilter),
                clientId: safeTrim(this.clientIdFilter),
                petId: safeTrim(this.petIdFilter),
                ...this.trimmedExtraInputs(),
                page,
                pageSize
            })
        );
    }
}

/** Ortak süzgeç ve sonuç bileşenleri rapora özgü sorgu/sonuç tipini bilmez. */
export type AnyReportListState = ReportListState<any, ReportListResultBase>;

function defaultReportFromYyyyMmDd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');

    return `${y}-${m}-01`;
}
