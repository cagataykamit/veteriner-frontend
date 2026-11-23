import { HttpErrorResponse } from '@angular/common/http';
import type { Params } from '@angular/router';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import type { DeletableRecordKind, DeleteBlockedVm, DeleteBlockReason } from '@/app/entities/record-deletion/models/record-deletion.model';
import { messageFromHttpError, problemCodeFromHttpError, type ProblemMessages } from '@/app/shared/utils/api-error.utils';

/**
 * Yumuşak silme ve geri yükleme hata kodları (`CLIENT_PET_DELETION_API_CONTRACT.md` §2–§4). Panel genelinde kayıtlıdır
 * (`src/problem-messages.ts`): silinen kayda yazma girişimi (düzenleme, ücret, randevu…) her ekranda aynı metni gösterir.
 * `*.DeleteBlocked` burada değildir: onay penceresi nedenleri `deleteBlockReasonItems` ile madde madde gösterir.
 */
export const RECORD_DELETION_PROBLEM_MESSAGES: ProblemMessages = {
    'Clients.Deleted': 'Bu müşteri silinmiş; yeni işlem yapılamaz. Yönetici "Silinenler"den geri yükleyebilir.',
    'Pets.Deleted': 'Bu hasta silinmiş; yeni işlem yapılamaz. Yönetici "Silinenler"den geri yükleyebilir.',
    'Pets.ClientDeleted': 'Hastanın müşterisi silinmiş; önce müşteriyi geri yükleyin.',
    'Clients.RestoreConflict': 'Aynı bilgilerle aktif bir müşteri var; o kaydı kullanın ya da bilgileri düzenleyin.',
    'Pets.DuplicatePet': 'Bu müşteride aynı ad ve türde aktif bir hasta var; geri yüklenemez.'
};

/** Yalnız silme isteğinde geçerli metinler: aynı kod satışta "düzenlenemez" anlamında başka tabloda da var. */
const RECORD_DELETE_OVERRIDES: ProblemMessages = {
    'Clients.WalkInReadOnly': 'Peşin müşteri (doğrudan satış kaydı) silinemez.'
};

const DELETE_BLOCK_REASONS: readonly DeleteBlockReason[] = ['OpenAccount', 'ActiveHospitalization', 'OpenVisit', 'FutureAppointments'];

/** Silme / geri yükleme hatası: kullanıcı metni ve ekranın bağlantı kurduğu ekler (engel nedenleri, çakışan müşteri). */
export class RecordDeletionError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        /** 409 `*.DeleteBlocked` ise nedenler; değilse `null`. */
        readonly blocked: DeleteBlockedVm | null = null,
        /** 409 `Clients.RestoreConflict` ise aktif çakışan müşteri. */
        readonly conflictingClientId: string | null = null
    ) {
        super(message);
        this.name = 'RecordDeletionError';
    }
}

/** Silme ve geri yükleme uçlarının hata dönüştürücüsü (müşteri ve hasta servisi ortak). */
export function toRecordDeletionError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);

        return throwError(
            () => new RecordDeletionError(messageFromHttpError(err, fallback, RECORD_DELETE_OVERRIDES), code, deleteBlockedFromHttp(err, code), conflictingClientIdFromHttp(err, code))
        );
    });
}

/** ProblemDetails eki: ASP.NET ekleri gövdenin kökünde yazar; eski biçimde `extensions` altında olabilir. */
function problemExtension(err: HttpErrorResponse, key: string): unknown {
    const body = err.error as Record<string, unknown> | null;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return undefined;
    }

    const ext = body['extensions'] as Record<string, unknown> | undefined;

    return body[key] ?? ext?.[key];
}

function countExtension(err: HttpErrorResponse, key: string): number {
    const v = problemExtension(err, key);

    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

function deleteBlockedFromHttp(err: HttpErrorResponse, code: string | null): DeleteBlockedVm | null {
    if (!code?.endsWith('.DeleteBlocked')) {
        return null;
    }

    const raw = problemExtension(err, 'reasons');
    const reasons = Array.isArray(raw) ? DELETE_BLOCK_REASONS.filter((r) => raw.includes(r)) : [];

    return {
        reasons,
        activeHospitalizationCount: countExtension(err, 'activeHospitalizationCount'),
        openVisitCount: countExtension(err, 'openVisitCount'),
        futureAppointmentCount: countExtension(err, 'futureAppointmentCount')
    };
}

function conflictingClientIdFromHttp(err: HttpErrorResponse, code: string | null): string | null {
    if (code !== 'Clients.RestoreConflict') {
        return null;
    }

    const id = problemExtension(err, 'conflictingClientId');

    return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Engel maddesinin bağlantısı: sorunun giderileceği ekran. */
export interface DeleteBlockLink {
    readonly label: string;
    readonly route: readonly string[];
    readonly queryParams?: Params;
}

/** Geri yükleme reddinin çözüm bağlantısı: çakışan aktif müşteri ya da önce geri yüklenecek müşteri; başka hatada `null`. */
export function restoreErrorLink(err: unknown, petClientId: string | null): DeleteBlockLink | null {
    if (!(err instanceof RecordDeletionError)) {
        return null;
    }

    if (err.conflictingClientId) {
        return { label: 'Aktif müşteriyi aç', route: ['/panel/clients', err.conflictingClientId] };
    }

    return err.code === 'Pets.ClientDeleted' && petClientId ? { label: 'Müşteri kartı', route: ['/panel/clients', petClientId] } : null;
}

export interface DeleteBlockItem {
    readonly reason: DeleteBlockReason;
    readonly text: string;
    readonly link: DeleteBlockLink;
}

/**
 * Onay penceresindeki engel maddeleri, sunucu sırasıyla. Metinler sözleşme §4 anahtarlarıdır; bağlantı sorunun çözüldüğü yere gider:
 * açık hesap → müşterinin ücretleri, yatış → yatışlar, randevular → müşterinin/hastanın randevuları, açık geliş → Bugün.
 */
export function deleteBlockReasonItems(blocked: DeleteBlockedVm, ctx: { readonly kind: DeletableRecordKind; readonly clientId: string | null; readonly petId: string | null }): DeleteBlockItem[] {
    const scope: Params = ctx.kind === 'pet' && ctx.petId ? { petId: ctx.petId } : ctx.clientId ? { clientId: ctx.clientId } : {};

    return blocked.reasons.map((reason): DeleteBlockItem => {
        switch (reason) {
            case 'OpenAccount':
                return {
                    reason,
                    text: 'Açık hesabı var (borç, tahsis edilmemiş ödeme ya da kredi); önce hesabı kapatın.',
                    link: { label: 'Müşteri hesabı', route: ['/panel/charges'], queryParams: ctx.clientId ? { clientId: ctx.clientId } : undefined }
                };
            case 'ActiveHospitalization':
                return {
                    reason,
                    text:
                        blocked.activeHospitalizationCount > 1
                            ? `${blocked.activeHospitalizationCount} aktif yatışı var; önce taburcu edin ya da yatışı iptal edin.`
                            : 'Aktif yatışı var; önce taburcu edin ya da yatışı iptal edin.',
                    // Yatış listesi yalnız hasta bağlamı süzgecini tanır.
                    link: { label: 'Yatışlar', route: ['/panel/hospitalizations'], queryParams: ctx.kind === 'pet' && ctx.petId ? { petId: ctx.petId } : undefined }
                };
            case 'OpenVisit':
                return { reason, text: 'Bugün açık gelişi var; önce gelişi tamamlayın ya da iptal edin.', link: { label: 'Bugün', route: [TODAY_ROUTE] } };
            case 'FutureAppointments':
                return {
                    reason,
                    text:
                        blocked.futureAppointmentCount > 0
                            ? `${blocked.futureAppointmentCount} gelecek randevusu var; önce randevuları iptal edin.`
                            : 'Gelecek randevusu var; önce randevuları iptal edin.',
                    link: { label: 'Randevular', route: ['/panel/appointments'], queryParams: scope }
                };
        }
    });
}
