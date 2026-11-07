import { HttpErrorResponse } from '@angular/common/http';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import type { ClinicSiteMissing } from '@/app/features/clinic-site/models/clinic-site.model';
import { messageFromHttpError, problemCodeFromHttpError, type ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Sözleşme §7'deki kodlar → kullanıcı mesajı. `ClinicSites.Validation` backend `detail` ile gösterilir, alanı söyler. */
const CLINIC_SITE_PROBLEM_MESSAGES: ProblemMessages = {
    'ClinicSites.ConcurrencyConflict': 'Bu taslak siz düzenlerken başka bir sekmede ya da başka bir kullanıcı tarafından değiştirildi.',
    'ClinicSites.SlugTaken': 'Bu adres kullanılıyor; başka bir adres deneyin.',
    'ClinicSites.ClinicInactive': 'Klinik pasif olduğu için yayınlanamaz.',
    'ClinicSites.NotFound': 'Site bulunamadı; sayfayı yenileyin.',
    'ClinicSites.VersionNotFound': 'Bu sürüm artık saklanmıyor; liste yenilendi.',
    'ClinicSites.ImageNotFound': 'Görsel bulunamadı; liste yenilendi.',
    'ClinicSites.ImageInUse': 'Bu görsel kullanılıyor; önce kullanıldığı yerden kaldırın.',
    'Files.Validation': 'Dosya boş.',
    'Files.TooLarge': 'Görsel 5 MB sınırını aşıyor.',
    'Files.UnsupportedType': 'Yalnız JPEG, PNG ve WebP yüklenebilir.',
    'Files.LimitReached': 'Site başına en çok 100 görsel yüklenebilir. Kullanmadığınız görselleri silin.',
    'Files.StorageUnavailable': 'Dosya deposuna şu anda ulaşılamıyor; biraz sonra tekrar deneyin.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu klinik için yetkiniz yok.'
};

/** Kullanıcıya gösterilecek mesaj, sunucu kodu ve sorun gövdesindeki ek alanlar. */
export class ClinicSiteError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        readonly missing: readonly ClinicSiteMissing[] = [],
        readonly missingImageIds: readonly string[] = [],
        readonly usedIn: readonly string[] = []
    ) {
        super(message);
    }
}

/** Yayın isteği 409 `missing`, görsel silme 409 `usedIn` taşır: gövde kökünde ya da `extensions` altında olabilir. */
function problemList(err: HttpErrorResponse, key: string): readonly string[] {
    const body = (err.error ?? {}) as Record<string, unknown>;
    const value = body[key] ?? (body['extensions'] as Record<string, unknown> | undefined)?.[key];

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function toClinicSiteError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        return throwError(
            () =>
                new ClinicSiteError(
                    messageFromHttpError(err, fallback, CLINIC_SITE_PROBLEM_MESSAGES),
                    problemCodeFromHttpError(err),
                    problemList(err, 'missing') as readonly ClinicSiteMissing[],
                    problemList(err, 'missingImageIds'),
                    problemList(err, 'usedIn')
                )
        );
    });
}

export function clinicSiteErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
}
