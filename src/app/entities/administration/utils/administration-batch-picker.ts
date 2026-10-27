import { computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { catchError, merge, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { suggestAdministrationBatch } from '@/app/entities/administration/utils/administration-batch.utils';
import type { ProductStockBatchesVm } from '@/app/entities/inventory/models/stock-batch-vm.model';
import { StockBatchService } from '@/app/entities/inventory/services/stock-batch.service';

export interface AdministrationBatchPickerControls {
    productId: AbstractControl<string | null>;
    /** Boş = otomatik (sunucu FEFO ile seçer). */
    batchId: AbstractControl<string>;
    quantity: AbstractControl<number | null>;
}

export interface AdministrationBatchGuide {
    text: string;
    warn: boolean;
}

/**
 * Uygulama/aşı formlarının ortak parti seçimi: ürün seçilince aktif kliniğin parti bakiyesini yükler,
 * seçenekleri (süresi geçmiş parti devre dışı) ve "otomatik"/seçili parti rehber metnini üretir.
 * Enjeksiyon bağlamında (bileşen alanı/constructor) çağrılır; ürün değişince parti seçimi "otomatik"e döner.
 */
export function createAdministrationBatchPicker(controls: AdministrationBatchPickerControls) {
    const stockBatchService = inject(StockBatchService);
    const auth = inject(AuthService);

    const info = signal<ProductStockBatchesVm | null>(null);
    const loading = signal(false);
    const error = signal<string | null>(null);

    const formValue = toSignal(
        merge(controls.productId.valueChanges, controls.batchId.valueChanges, controls.quantity.valueChanges).pipe(startWith(null)),
        { initialValue: null }
    );

    const load = (productId: string | null) => {
        const clinicId = auth.getClinicId()?.trim();

        if (!productId || !clinicId) {
            loading.set(false);

            return of(null);
        }

        loading.set(true);

        return stockBatchService.getByProduct(productId, clinicId).pipe(
            catchError((e: Error) => {
                error.set(e.message || 'Parti bilgisi yüklenemedi.');

                return of(null);
            })
        );
    };

    controls.productId.valueChanges
        .pipe(
            tap(() => {
                controls.batchId.setValue('', { emitEvent: false });
                info.set(null);
                error.set(null);
            }),
            switchMap((productId) => load(productId)),
            takeUntilDestroyed()
        )
        .subscribe((next) => {
            info.set(next);
            loading.set(false);
        });

    const options = computed(() => {
        const unit = info()?.unit ?? '';

        return [
            { value: '', label: "Otomatik — SKT'si en yakın uygun parti", disabled: false },
            ...(info()?.batches ?? []).map((b) => ({
                value: b.id,
                label: `${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${unit}${b.isExpired ? ' · süresi geçmiş' : ''}`.trim(),
                disabled: b.isExpired
            }))
        ];
    });

    /** Seçili partinin kalanı/SKT'si veya "otomatik"te sunucunun seçeceği partinin önerisi. */
    const guide = computed<AdministrationBatchGuide | null>(() => {
        formValue();
        const current = info();

        if (!current) {
            return null;
        }

        const quantity = controls.quantity.value;
        const batchId = controls.batchId.value;
        const unit = current.unit;

        if (batchId) {
            const b = current.batches.find((x) => x.id === batchId);

            if (!b) {
                return null;
            }

            const text = `Seçilen parti: ${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${unit}.`;

            return quantity != null && quantity > b.remainingQuantity
                ? { text: `${text} Miktar bu partinin kalanından fazla; bir uygulama iki partiye bölünmez.`, warn: true }
                : { text, warn: false };
        }

        const s = suggestAdministrationBatch(current, quantity);

        switch (s?.kind) {
            case 'batch':
                return { text: `Önerilen parti: ${s.batch.lotNumber} · SKT ${s.batch.expiryText} · kalan ${s.batch.remainingText} ${unit}.`, warn: false };
            case 'unbatched':
                return { text: 'Yeterli parti yok; partisiz (devir) bakiyeden düşülecek, kayıtta seri no ve SKT olmayacak.', warn: false };
            case 'expiredOnly':
                return { text: 'Yeterli stok yalnız süresi geçmiş partide; süresi geçmiş partiyle uygulama kaydedilemez.', warn: true };
            case 'insufficient':
                return { text: 'Hiçbir parti bu miktarı tek başına karşılamıyor; miktarı azaltıp ayrı kayıt girin.', warn: true };
            default:
                return null;
        }
    });

    return { info, loading, error, options, guide };
}

export type AdministrationBatchPicker = ReturnType<typeof createAdministrationBatchPicker>;
