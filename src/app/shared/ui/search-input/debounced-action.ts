import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

/**
 * Filtre değişimlerini (tarih, açılır kutu, müşteri…) tek aramaya toplar: her çağrı bekleme süresini sıfırlar, süre dolunca
 * `action` bir kez çalışır. Tarih alanına yazarken ara değerlerde art arda istek atılmasını önler. Enjeksiyon bağlamında
 * (alan başlatıcısı) çağrılmalıdır; bileşen yok olunca abonelik kapanır.
 */
export function debouncedAction(action: () => void, ms = 400): () => void {
    const trigger$ = new Subject<void>();

    trigger$.pipe(debounceTime(ms), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => action());

    return () => trigger$.next();
}
