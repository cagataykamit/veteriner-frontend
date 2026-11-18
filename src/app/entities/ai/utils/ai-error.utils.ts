import { HttpErrorResponse } from '@angular/common/http';
import type { AiEntryState, AiStatusVm } from '@/app/entities/ai/models/ai-vm.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/**
 * Yapay zekâ durum ve hata metinleri tek yerde (tasarım: ux/ai-arayuz-tasarim.md "Görünürlük" ve "İstek durumları").
 * Ton yardımcıdır: kırmızı ve "hata" sözcüğü yok; her hata yalnız AI alanını etkiler (ADR-008 madde 6).
 */

const UNTOUCHED = 'Hasta kartı ve kayıtlar etkilenmedi';

/** Sınır doldu / sistem durdu: giriş düğmesi soluk kalır, nedeni altında yazar. */
export const AI_SYSTEM_UNAVAILABLE_REASON = 'Yapay zekâ şu an kullanılamıyor';
export const AI_CLINIC_SELECTION_REASON = 'Önce klinik seçin';

/** "Bu ayın AI kotası doldu · 1 Aralık'ta yenilenir": kota İstanbul takvim ayının ilk günü yenilenir (`status`'ta tarih yok). */
export function aiQuotaExceededReason(now: Date = new Date()): string {
    return `Bu ayın AI kotası doldu · ${aiQuotaResetLabel(now)}`;
}

const RESET_DAY_LABELS = ["1 Ocak'ta", "1 Şubat'ta", "1 Mart'ta", "1 Nisan'da", "1 Mayıs'ta", "1 Haziran'da", "1 Temmuz'da", "1 Ağustos'ta", "1 Eylül'de", "1 Ekim'de", "1 Kasım'da", "1 Aralık'ta"];

const ISTANBUL_MONTH = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', month: 'numeric' });

export function aiQuotaResetLabel(now: Date = new Date()): string {
    const month = Number(ISTANBUL_MONTH.format(now)); // 1–12

    return `${RESET_DAY_LABELS[month % 12]} yenilenir`;
}

/**
 * Giriş düğmesi: izin yoksa, durum okunamadıysa, yapılandırılmamış ya da klinikte kapalıysa hiç görünmez (UX ilkesi 11, 13);
 * kota/bütçe/klinik seçimi gibi geçici engellerde soluk ve nedeni yazılı.
 */
export function aiEntryState(status: AiStatusVm | null, canUse: boolean, now: Date = new Date()): AiEntryState {
    if (!canUse || !status) {
        return { kind: 'hidden' };
    }

    if (status.isAvailable) {
        return { kind: 'available' };
    }

    switch (status.unavailableCode) {
        case 'Ai.NotConfigured':
        case 'Ai.ClinicNotEnabled':
            return { kind: 'hidden' };
        case 'Ai.ClinicQuotaExceeded':
            return { kind: 'disabled', reason: aiQuotaExceededReason(now) };
        case 'Clinics.ClinicSelectionRequired':
            return { kind: 'disabled', reason: AI_CLINIC_SELECTION_REASON };
        default:
            return { kind: 'disabled', reason: AI_SYSTEM_UNAVAILABLE_REASON };
    }
}

/** Kliniğin aylık kullanımı bu orana gelince sonucun altında uyarı notu çıkar (ADR-044 madde 7). */
export const AI_USAGE_WARNING_PERCENT = 80;

export function aiUsageWarning(status: AiStatusVm | null): string | null {
    const p = status?.clinicMonthUsedPercent ?? 0;

    return p >= AI_USAGE_WARNING_PERCENT ? `Kliniğin bu ayki AI kullanımı %${Math.min(100, Math.round(p))}. Sınır dolunca yalnız AI özellikleri durur; diğer işler etkilenmez.` : null;
}

/** 429 `Ai.RateLimited`: sözleşmede `Retry-After` yok; istemci 60 sn sayar, başlık gelirse ona uyar. */
export const AI_RATE_LIMIT_FALLBACK_SECONDS = 60;

/** Panelde gösterilen istek sorunu. `retryAfterSeconds` doluysa "Yeniden dene" geri sayımla pasif durur. */
export interface AiProblem {
    code: string | null;
    title: string;
    message: string;
    /** Tekrar dene düğmesi gösterilsin mi. */
    retryable: boolean;
    retryAfterSeconds: number | null;
    /** Kullanılabilirlik değişmiş olabilir: durum ucu yeniden sorulur (kota, bütçe, kapalı, klinik). */
    refreshStatus: boolean;
}

/** Hangi işin sorunu: başlıklar "Özet şu an hazırlanamadı" / "Taslak şu an hazırlanamadı". */
export type AiSubject = 'summary' | 'draft';

const SUBJECT_NOUN: Record<AiSubject, string> = { summary: 'Özet', draft: 'Taslak' };
const REFUSED_TITLE: Record<AiSubject, string> = { summary: 'Bu kayıtlar için özet üretilemedi', draft: 'Bu içerik için taslak üretilemedi' };

export function aiProblemFromError(err: unknown, subject: AiSubject, now: Date = new Date()): AiProblem {
    const http = err instanceof HttpErrorResponse ? err : null;
    const code = http ? problemCodeFromHttpError(http) : null;
    const noun = SUBJECT_NOUN[subject];
    const problem = (title: string, message: string, retryable: boolean, refreshStatus = false): AiProblem => ({ code, title, message, retryable, retryAfterSeconds: null, refreshStatus });

    switch (code) {
        case 'Ai.RateLimited':
            return { ...problem('Kısa sürede çok fazla istek gönderildi', `Bir dakika içinde yeniden deneyebilirsiniz. ${UNTOUCHED}.`, true), retryAfterSeconds: retryAfterSeconds(http) };
        case 'Ai.ClinicQuotaExceeded':
            return problem('Bu ayın AI kotası doldu', `Kota ${aiQuotaResetLabel(now)}. ${UNTOUCHED}.`, false, true);
        case 'Ai.SystemBudgetExhausted':
        case 'Ai.NotConfigured':
        case 'Ai.ClinicNotEnabled':
            return problem(AI_SYSTEM_UNAVAILABLE_REASON, `${UNTOUCHED}.`, false, true);
        case 'Clinics.ClinicSelectionRequired':
            return problem(AI_CLINIC_SELECTION_REASON, 'Yapay zekâ yalnız seçili kliniğin kayıtlarıyla çalışır.', false, true);
        case 'Ai.ProviderUnavailable':
            return problem(`${noun} şu an hazırlanamadı`, `Yapay zekâ hizmetine ulaşılamadı. ${UNTOUCHED}; birazdan yeniden deneyebilirsiniz.`, true);
        case 'Ai.InvalidOutput':
            return problem(`${noun} şu an hazırlanamadı`, `Yapay zekânın yanıtı kullanılabilir değildi. ${UNTOUCHED}; birazdan yeniden deneyebilirsiniz.`, true);
        case 'Ai.ProviderRejected':
            return problem('Yapay zekâ hizmeti isteği kabul etmedi', 'Sorun sürerse destek ekibine yazın.', false);
        case 'Ai.Refused':
            return problem(REFUSED_TITLE[subject], 'Kayıtlar her zamanki gibi okunabilir.', false);
        case 'AiDrafts.NotFound':
            return problem('Taslak bulunamadı', 'Taslak başka bir klinikte olabilir ya da kaldırılmış olabilir.', false);
        case 'AiDrafts.Forbidden':
            return problem('Bu taslağa karar verme yetkiniz yok', 'Taslağı, ilgili kaydı düzenleme yetkisi olan biri kabul edebilir.', false);
        case 'AiDrafts.NotPending':
            return problem('Bu taslağa zaten karar verilmiş', 'Kaydı yenileyip son durumu görün.', false);
        case 'AiDrafts.Expired':
            return problem('Taslağın süresi doldu', 'Hiçbir şey kaydedilmedi; yeni bir taslak hazırlayabilirsiniz.', false);
        case 'AiDrafts.Validation':
            return problem('Düzenlenen taslak kaydedilemedi', http ? messageFromHttpError(http, 'Metni kısaltıp yeniden deneyin.') : 'Metni kısaltıp yeniden deneyin.', false);
        case 'AiDrafts.FeatureNotSupported':
            return problem('Bu taslak türü henüz desteklenmiyor', 'Hiçbir şey kaydedilmedi.', false);
        default:
            return problem(`${noun} şu an hazırlanamadı`, http ? `${messageFromHttpError(http, 'Yapay zekâ isteği tamamlanamadı.')} ${UNTOUCHED}.` : `${UNTOUCHED}; birazdan yeniden deneyebilirsiniz.`, true);
    }
}

function retryAfterSeconds(err: HttpErrorResponse | null): number {
    const header = err?.headers?.get('Retry-After');
    const sec = header ? Number.parseInt(header, 10) : NaN;

    return Number.isFinite(sec) && sec > 0 ? sec : AI_RATE_LIMIT_FALLBACK_SECONDS;
}
