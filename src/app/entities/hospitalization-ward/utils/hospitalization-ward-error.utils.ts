import { HttpErrorResponse } from '@angular/common/http';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const DUPLICATE_NAME_CODES = new Set(['HospitalizationWards.DuplicateName', 'HospitalizationRooms.DuplicateName']);
const NOT_FOUND_CODES = new Set(['HospitalizationWards.NotFound', 'HospitalizationRooms.NotFound']);

/** Bölüm/oda tanım uçlarının kodları (`docs/HOSPITALIZATION_MODEL_API_CONTRACT.md` §10.5) → kullanıcı mesajı. */
const HOSPITALIZATION_WARD_PROBLEM_MESSAGES: Record<string, string> = {
    'HospitalizationWards.DuplicateName': 'Bu klinikte bu adda aktif bir bölüm zaten var. Farklı bir ad yazın veya önce diğer bölümü pasife alın.',
    'HospitalizationRooms.DuplicateName': 'Bu bölümde bu adda aktif bir oda zaten var. Farklı bir ad yazın veya önce diğer odayı pasife alın.',
    'HospitalizationWards.NotFound': 'Bölüm bu klinikte bulunamadı; liste yenilendi.',
    'HospitalizationRooms.NotFound': 'Oda bu bölümde bulunamadı; liste yenilendi.',
    'HospitalizationWards.Validation': 'Bölüm adı boş olamaz ve 100 karakteri aşamaz.',
    'HospitalizationRooms.Validation': 'Oda adı boş olamaz ve 100 karakteri aşamaz.',
    'HospitalizationWards.RouteIdMismatch': 'İstek kimliği kayıtla uyuşmuyor; sayfayı yenileyip tekrar deneyin.',
    'HospitalizationRooms.RouteIdMismatch': 'İstek kimliği kayıtla uyuşmuyor; sayfayı yenileyip tekrar deneyin.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu kliniğin yatış konumlarına erişim yetkiniz yok.'
};

/** Kullanıcıya gösterilecek mesaj; mükerrer ad pencerede kalır, bulunamadı liste yenilemesi ister. */
export class HospitalizationWardError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        readonly isDuplicateName: boolean,
        readonly isNotFound: boolean
    ) {
        super(message);
    }
}

export function hospitalizationWardProblemMessage(err: HttpErrorResponse, fallback: string): string {
    return messageFromHttpError(err, fallback, HOSPITALIZATION_WARD_PROBLEM_MESSAGES);
}

export function toHospitalizationWardError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);

        return throwError(
            () =>
                new HospitalizationWardError(
                    hospitalizationWardProblemMessage(err, fallback),
                    code,
                    !!code && DUPLICATE_NAME_CODES.has(code),
                    !!code && NOT_FOUND_CODES.has(code)
                )
        );
    });
}
