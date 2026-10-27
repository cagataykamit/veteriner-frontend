import { signal, type WritableSignal } from '@angular/core';
import type { Observable } from 'rxjs';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { PaginatorState } from 'primeng/types/paginator';

/** Sayfalı liste yanıtının iskeletin kullandığı alanları. */
export interface ListPageResult<T> {
    readonly items: T[];
    readonly totalItems: number;
    readonly page: number;
    readonly pageSize: number;
}

/** Süzgeç ve sayfa konumunun `sessionStorage`'da saklanması (sayfadan çıkıp dönünce korunur). */
export interface ListPagePersistConfig {
    /** `sessionStorage` anahtarı. */
    readonly key: string;
    /** Sayfaya özgü süzgeç alanları; `page` ve `pageSize` iskelet tarafından eklenir. */
    readonly save: () => Record<string, unknown>;
    /** Geçerli kayıttan süzgeçleri geri yükler; `page` / `pageSize` iskelet tarafından uygulanır. */
    readonly restore: (state: Record<string, unknown>) => void;
}

export interface ListPageConfig<T> {
    /** Etkin süzgeçlerle istenen sayfayı getirir. */
    readonly fetch: (page: number, pageSize: number) => Observable<ListPageResult<T>>;
    /** Aynı istek tekrarını önleyen anahtar; etkin süzgeçlerin tamamını içermelidir. */
    readonly loadKey: (page: number, pageSize: number) => string;
    /** Yükleme hatasının metni; varsayılan hatanın `message`'ı, yoksa "Yükleme hatası". */
    readonly errorMessage?: (e: unknown) => string;
    /**
     * Verilirse süzgeç ve sayfa konumu saklanır; sayfa boyutu değişince ilk sayfaya dönülür. Verilmezse sayfa konumu
     * tablo olayından hesaplanır ve saklanmaz.
     */
    readonly persist?: ListPagePersistConfig;
    /** Varsayılan 10. */
    readonly pageSize?: number;
    /** Varsayılan 10-50. */
    readonly rowsPerPageOptions?: number[];
    /** Yanıt uygulandıktan sonra (sayfaya özgü ek durum). */
    readonly onLoaded?: (result: ListPageResult<T>) => void;
}

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 20, 25, 50];

const defaultErrorMessage = (e: unknown) => (e as Error | undefined)?.message ?? 'Yükleme hatası';

/**
 * Panel liste sayfalarının ortak iskeleti: sayfalama sinyalleri, tablo (tembel yükleme) ve mobil sayfalayıcı olayları,
 * aynı istek tekrarını önleme ve isteğe bağlı oturumda saklama. Süzgeç alanları ve sorgu sayfadadır (`fetch`, `loadKey`).
 * `ReportListState` deseni: yapılandırma nesnesiyle bileşen alan başlatıcısında kurulur.
 */
export class ListPageState<T> {
    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly items = signal<T[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize: WritableSignal<number>;
    readonly first = signal(0);
    readonly currentPage = signal(1);
    readonly rowsPerPageOptions: number[];

    /** Tablo ilk sonuçla kurulurken yaydığı tembel yükleme olayı ve mobil sayfalayıcı sonrası tablonun olayı yutulur. */
    private suppressNextLazy = false;
    private lastLoadKey = '';

    constructor(private readonly config: ListPageConfig<T>) {
        this.pageSize = signal(config.pageSize ?? 10);
        this.rowsPerPageOptions = config.rowsPerPageOptions ?? DEFAULT_ROWS_PER_PAGE_OPTIONS;
    }

    /** İlk yükleme: geçerli sayfa konumuyla yükler, tablonun açılış olayını yutar. */
    startInitialLoad(): void {
        this.suppressNextLazy = true;
        this.load(this.currentPage(), this.pageSize());
    }

    /** Süzgeç uygulandı: ilk sayfaya dönülür, konum saklanır. */
    loadFirstPage(): void {
        this.first.set(0);
        this.currentPage.set(1);
        this.persist(1, this.pageSize());
        this.load(1, this.pageSize());
    }

    /** Süzgeçler temizlendi: ilk sayfaya dönülür, saklanan konum silinir. */
    resetToFirstPage(): void {
        this.first.set(0);
        this.currentPage.set(1);
        this.clearPersisted();
        this.load(1, this.pageSize());
    }

    /** Aynı sayfa ve süzgeçle zorla yeniden yükler. */
    reload(): void {
        this.load(this.currentPage(), this.pageSize(), true);
    }

    /** Sayfa ilk sayfaya alınır (yükleme yapılmaz); bağlam süzgeci temizleme gibi akışlar ardından `reload()` çağırır. */
    goToFirstPage(): void {
        this.currentPage.set(1);
        this.first.set(0);
    }

    /** Tabloyu yeniden kurabilen yüklemeler (boş sonuçtan dolu sonuca geçiş) öncesi: tablonun açılış olayı yutulur. */
    suppressNextTableLoad(): void {
        this.suppressNextLazy = true;
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;

            return;
        }

        this.changePage(event.first ?? 0, event.rows ?? this.pageSize());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;

        this.suppressNextLazy = true;
        this.changePage(first, rows);
    }

    /** Saklanan süzgeç ve konumu geri yükler; kayıt yoksa ya da bozuksa `false` (bozuk kayıt silinir). */
    restore(): boolean {
        const persist = this.config.persist;

        if (!persist) {
            return false;
        }

        const raw = sessionStorage.getItem(persist.key);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const page = Number(parsed['page']);
            const pageSize = Number(parsed['pageSize']);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(persist.key);

                return false;
            }

            persist.restore(parsed);
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(persist.key);

            return false;
        }
    }

    persist(page: number, pageSize: number): void {
        const persist = this.config.persist;

        if (persist) {
            sessionStorage.setItem(persist.key, JSON.stringify({ ...persist.save(), page, pageSize }));
        }
    }

    clearPersisted(): void {
        if (this.config.persist) {
            sessionStorage.removeItem(this.config.persist.key);
        }
    }

    private changePage(eventFirst: number, rows: number): void {
        if (!this.config.persist) {
            this.load(Math.floor(eventFirst / rows) + 1, rows);

            return;
        }

        if (rows !== this.pageSize()) {
            this.first.set(0);
            this.currentPage.set(1);
            this.persist(1, rows);
            this.load(1, rows);

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persist(page, rows);
        this.load(page, rows);
    }

    private load(page: number, pageSize: number, force = false): void {
        const key = this.config.loadKey(page, pageSize);

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.config.fetch(page, pageSize).subscribe({
            next: (r) => {
                this.items.set(r.items);
                this.totalItems.set(r.totalItems);
                this.pageSize.set(r.pageSize);
                this.currentPage.set(r.page);
                this.first.set((r.page - 1) * r.pageSize);
                this.persist(r.page, r.pageSize);
                this.config.onLoaded?.(r);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set((this.config.errorMessage ?? defaultErrorMessage)(e));
                this.loading.set(false);
            }
        });
    }
}
