import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, EMPTY, Observable, switchMap, tap } from 'rxjs';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

export interface RouteEntityLoaderConfig<T> {
    /** Kaydı rota kimliğiyle getirir. */
    readonly fetch: (id: string) => Observable<T>;
    /** Rota parametresi yok ya da boş: gösterilecek hata (ör. "Geçersiz ürün."). */
    readonly invalidIdMessage: string;
    /** Yükleme hatasının metni; varsayılan hatanın `message`'ı, yoksa "Yükleme hatası". */
    readonly errorMessage?: (e: unknown) => string;
    /** Rota parametresinin adı; varsayılan `id`. */
    readonly paramName?: string;
    /** Rota kimliği her yayıldığında, yüklemeden önce (geçersizse `null`): sayfaya özgü durumu sıfırlama. */
    readonly onRouteChange?: (id: string | null) => void;
    /** `reload()` başında, yüklemeden önce. */
    readonly onReload?: () => void;
    /** Kayıt geldi (rota yüklemesi ve `reload`): ilgili blokları yükleme. */
    readonly onLoaded?: (value: T, id: string) => void;
    readonly onError?: (e: unknown) => void;
}

const defaultErrorMessage = (e: unknown) => panelHttpFailureMessage(e, 'Yükleme hatası');

/**
 * Detay sayfası iskeleti: rota kimliği → kaydı getir → `loading` / `error` / `value`; aynı kimlikle `reload()`.
 * Rota kimliği değişince önceki istek iptal edilir (`switchMap`); bir yüklemenin hatası sonraki kimlik değişimlerini durdurmaz.
 * Enjeksiyon bağlamında (bileşen alan başlatıcısı) oluşturulur, `ngOnInit`'te `init()` ile başlatılır.
 */
export class RouteEntityLoader<T> {
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly value = signal<T | null>(null);

    private currentId: string | null = null;

    constructor(private readonly config: RouteEntityLoaderConfig<T>) {}

    /** Son geçerli rota kimliği (yükleniyor olabilir); henüz yoksa `null`. */
    get id(): string | null {
        return this.currentId;
    }

    init(): void {
        const paramName = this.config.paramName ?? 'id';

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get(paramName) || null;

                    this.config.onRouteChange?.(id);

                    if (!id) {
                        this.error.set(this.config.invalidIdMessage);
                        this.loading.set(false);

                        return EMPTY;
                    }

                    this.currentId = id;
                    this.loading.set(true);
                    this.error.set(null);

                    return this.fetch(id);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    reload(): void {
        const id = this.currentId;

        if (!id) {
            return;
        }

        this.config.onReload?.();
        this.loading.set(true);
        this.error.set(null);
        this.fetch(id).subscribe();
    }

    private fetch(id: string): Observable<T> {
        return this.config.fetch(id).pipe(
            tap((value) => {
                this.value.set(value);
                this.loading.set(false);
                this.config.onLoaded?.(value, id);
            }),
            catchError((e: unknown) => {
                this.error.set((this.config.errorMessage ?? defaultErrorMessage)(e));
                this.loading.set(false);
                this.config.onError?.(e);

                return EMPTY;
            })
        );
    }
}
