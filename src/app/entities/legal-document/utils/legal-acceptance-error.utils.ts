import { HttpErrorResponse } from '@angular/common/http';
import { problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Sunucu, gösterilen sürümün güncel olmadığını bildirir (409); istemci güncel sürümü yeniden okuyup tekrar onaylatır. */
export const LEGAL_VERSION_OUTDATED_CODE = 'LegalAcceptances.VersionOutdated';

/** Kayıt, davet katılımı ve kabul penceresinde aynı metin (`LEGAL_ACCEPTANCE_API_CONTRACT.md`). */
export const LEGAL_ACCEPTANCE_CODE_MESSAGES: Readonly<Record<string, string>> = {
    'LegalAcceptances.Required': 'Devam etmek için hukuki metinleri okuyup onay kutusunu işaretleyin.',
    [LEGAL_VERSION_OUTDATED_CODE]: 'Hukuki metinler güncellendi. Güncel metinleri inceleyip onay kutusunu yeniden işaretleyin.'
};

export function isLegalVersionOutdatedError(err: unknown): boolean {
    return err instanceof HttpErrorResponse && problemCodeFromHttpError(err) === LEGAL_VERSION_OUTDATED_CODE;
}
