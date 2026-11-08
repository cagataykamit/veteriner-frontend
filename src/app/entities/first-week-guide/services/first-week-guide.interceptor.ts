import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { firstWeekGuideKeysForRequest } from '@/app/entities/first-week-guide/utils/first-week-guide.steps';
import { FirstWeekGuideService } from '@/app/entities/first-week-guide/services/first-week-guide.service';

/**
 * İlk hafta rehberi: adımın işi (ilk randevu, ilk muayene…) başarıyla kaydedilince adımı "yapıldı" işaretler.
 * Örnek klinik verisi işareti etkilemez; yalnız bu kullanıcının bu tarayıcıdaki kayıtları sayılır.
 */
export const firstWeekGuideInterceptor: HttpInterceptorFn = (req, next) => {
    const keys = firstWeekGuideKeysForRequest(req.method, req.url, req.body);

    if (keys.length === 0) {
        return next(req);
    }

    const guide = inject(FirstWeekGuideService);

    return next(req).pipe(
        tap((event) => {
            if (event instanceof HttpResponse && event.ok) {
                guide.markDone(keys);
            }
        })
    );
};
