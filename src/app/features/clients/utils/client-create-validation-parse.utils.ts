import { HttpErrorResponse } from '@angular/common/http';
import { CLIENT_CREATE_PHONE_MSG_INVALID } from '@/app/features/clients/utils/client-create-phone.utils';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromClientCreateHttpError } from '@/app/features/clients/utils/client-create-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

/** Client create form kontrol adlarıyla hizalı. */
export type ClientCreateFormFieldKey = 'fullName' | 'phone' | 'email' | 'address' | 'notes' | 'status';

export type ClientCreateFieldErrors = Partial<Record<ClientCreateFormFieldKey, string>>;

export interface ParsedClientCreateHttpError {
    fieldErrors: ClientCreateFieldErrors;
    /** Üst bant — alan hataları varsa kısa özet; yoksa genel/ sunucu mesajı. */
    summaryMessage: string | null;
}

type ProblemBody = ProblemDetails & {
    errors?: Record<string, string[] | string | unknown> | null;
    validationErrors?: Record<string, string[] | string | unknown> | null;
};

/** ASP.NET / yaygın API: `errors` sözlüğü (alan adı → string[] veya string). */
function extractRawValidationErrors(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const raw = o['errors'] ?? o['validationErrors'];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    return raw as Record<string, unknown>;
}

function firstStringMessage(v: unknown): string | null {
    if (typeof v === 'string' && v.trim()) {
        return v.trim();
    }
    if (Array.isArray(v)) {
        for (const item of v) {
            if (typeof item === 'string' && item.trim()) {
                return item.trim();
            }
        }
    }
    return null;
}

/** `Phone`, `phone`, `$.phone` vb. → form alanı. */
function mapApiFieldKeyToFormField(rawKey: string): ClientCreateFormFieldKey | null {
    const key = rawKey
        .replace(/^\$/, '')
        .replace(/\[\d+]$/, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');

    const map: Record<string, ClientCreateFormFieldKey> = {
        phone: 'phone',
        phonenumber: 'phone',
        mobile: 'phone',
        mobil: 'phone',
        email: 'email',
        mail: 'email',
        fullname: 'fullName',
        full_name: 'fullName',
        name: 'fullName',
        adsoyad: 'fullName',
        address: 'address',
        adres: 'address',
        notes: 'notes',
        not: 'notes',
        notlar: 'notes',
        status: 'status',
        durum: 'status'
    };
    return map[key] ?? null;
}

/** Yaygın İngilizce doğrulama metinlerini Türkçe ürün diline yaklaştır (opsiyonel). */
function normalizeFieldMessage(formKey: ClientCreateFormFieldKey, message: string): string {
    const m = message.trim();
    if (formKey === 'phone') {
        if (/only.*digit|digits only|numeric|invalid phone|phone.*not valid/i.test(m)) {
            return CLIENT_CREATE_PHONE_MSG_INVALID;
        }
    }
    if (formKey === 'email' && /not a valid email|invalid email|email.*not valid/i.test(m)) {
        return 'Geçerli e-posta girin.';
    }
    return m;
}

function extractFieldErrorsFromBody(body: unknown): ClientCreateFieldErrors {
    const out: ClientCreateFieldErrors = {};
    const raw = extractRawValidationErrors(body);
    if (!raw) {
        return out;
    }

    for (const [apiKey, val] of Object.entries(raw)) {
        const formKey = mapApiFieldKeyToFormField(apiKey);
        if (!formKey) {
            continue;
        }
        const msg = firstStringMessage(val);
        if (!msg) {
            continue;
        }
        if (!out[formKey]) {
            out[formKey] = normalizeFieldMessage(formKey, msg);
        }
    }
    return out;
}

/** Bozuk UTF-8 / yanlış kodlama ile gelen ProblemDetails başlıkları. */
function isLikelyMojibake(s: string): boolean {
    if (!s) {
        return false;
    }
    if (/do\?rulama|hatas\?|olu\?tu|do\uFFFD|hata\uFFFD/i.test(s)) {
        return true;
    }
    if (/bir veya daha fazla/i.test(s) && /\?/.test(s)) {
        return true;
    }
    return /\?[ğüşıöçĞÜŞİÖÇa-z]/i.test(s) || /[a-z]\?[a-z]{2,}/i.test(s);
}

function isGenericValidationTitle(s: string): boolean {
    return (
        /one or more validation errors occurred/i.test(s) ||
        /^validation failed/i.test(s.trim()) ||
        /^bad request$/i.test(s.trim())
    );
}

/**
 * Alan sözlüğü yoksa güvenli genel mesaj (bozuk title/detail yerine).
 */
function resolveNonFieldErrorMessage(err: HttpErrorResponse): string {
    const status = err.status;
    const body = err.error as ProblemBody | string | null | undefined;

    if (status === 409) {
        return messageFromClientCreateHttpError(err);
    }

    if (typeof body === 'string') {
        const t = body.trim();
        if (t && !isLikelyMojibake(t)) {
            return t;
        }
        return FALLBACK_GENERIC;
    }

    if (body && typeof body === 'object') {
        const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
        if (detail && !isLikelyMojibake(detail) && !isGenericValidationTitle(detail)) {
            return detail;
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title && !isGenericValidationTitle(title) && !isLikelyMojibake(title)) {
            return title;
        }
    }

    if (status === 400 || status === 422) {
        return FALLBACK_GENERIC;
    }

    return messageFromClientCreateHttpError(err);
}

/**
 * Client create HTTP hatasını alan bazlı + üst özet mesaja dönüştürür.
 * Component içinde ham parse yapılmaz; tek giriş noktası.
 */
export function parseClientCreateHttpError(err: HttpErrorResponse): ParsedClientCreateHttpError {
    const fieldErrors = extractFieldErrorsFromBody(err.error);

    if (Object.keys(fieldErrors).length > 0) {
        return {
            fieldErrors,
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return {
        fieldErrors: {},
        summaryMessage: resolveNonFieldErrorMessage(err)
    };
}
