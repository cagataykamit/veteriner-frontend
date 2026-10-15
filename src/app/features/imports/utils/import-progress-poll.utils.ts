import { asyncScheduler, catchError, defer, EMPTY, exhaustMap, map, Observable, takeWhile, throwError, timer } from 'rxjs';
import type { ImportCommitProgressDto, ImportJobStatus } from '@/app/features/imports/models/import-api.model';

/** Yoklama aralığı (sözleşme 7.14: önerilen 1–2 sn). */
export const IMPORT_PROGRESS_POLL_MS = 2000;
/** Art arda bu kadar başarısız yoklamadan sonra akış hata verir; çağıran "bağlantı sorunu" gösterir ve elle yeniden başlatır. */
export const IMPORT_PROGRESS_MAX_FAILURES = 3;
/** İş sürerken kira bu kadar süre boş kalırsa (işçi almadı) "beklenenden uzun sürüyor" notu gösterilir. */
export const IMPORT_JOB_STALL_MS = 60_000;
/** Yoklama hata verdiğinde gösterilen mesaj; iş sunucuda sürdüğü için yalnız ilerleme bilgisi alınamamıştır. */
export const IMPORT_POLL_CONNECTION_MESSAGE = 'Bağlantı sorunu: ilerleme bilgisi alınamadı. İşlem arka planda sürüyor; yeniden deneyin.';

export interface ImportProgressTick {
    progress: ImportCommitProgressDto;
    /** Durum hâlâ yoklanan iş durumu mu; false ise son tıktır (iş bitti). */
    running: boolean;
    /** İş sürüyor ama kira `IMPORT_JOB_STALL_MS` boyunca hiç dolmadı: işçi kapalı/çökmüş olabilir. */
    stalled: boolean;
}

/**
 * Arka plan işinin (doğrulama, uygulama, geri alma) `progress` ucunu yoklar. Durum `job` iken her yanıtı yayar; durum
 * değişince son yanıtı `running = false` ile yayıp tamamlanır (çağıran parti ve önizlemeyi yeniden okur). Tek bir yoklama
 * hatası yutulur; `IMPORT_PROGRESS_MAX_FAILURES` kez art arda hata olursa son hatayla sonlanır. Önceki istek sürerken yeni
 * istek atılmaz.
 */
export function pollImportProgress(fetch: () => Observable<ImportCommitProgressDto>, job: ImportJobStatus): Observable<ImportProgressTick> {
    return defer(() => {
        let failures = 0;
        let waitingSince: number | null = null;

        return timer(0, IMPORT_PROGRESS_POLL_MS).pipe(
            exhaustMap(() => fetch().pipe(catchError((e: unknown) => (++failures >= IMPORT_PROGRESS_MAX_FAILURES ? throwError(() => e) : EMPTY)))),
            map((progress): ImportProgressTick => {
                failures = 0;
                const running = progress.status === job;
                const now = asyncScheduler.now();

                waitingSince = running && !progress.leaseActive ? (waitingSince ?? now) : null;

                return { progress, running, stalled: waitingSince !== null && now - waitingSince >= IMPORT_JOB_STALL_MS };
            }),
            takeWhile((t) => t.running, true)
        );
    });
}
