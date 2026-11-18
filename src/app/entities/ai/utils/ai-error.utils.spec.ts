import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import type { AiStatusVm } from '@/app/entities/ai/models/ai-vm.model';
import { aiEntryState, aiProblemFromError, aiQuotaResetLabel, aiUsageWarning } from '@/app/entities/ai/utils/ai-error.utils';

const status = (over: Partial<AiStatusVm> = {}): AiStatusVm => ({ isAvailable: true, unavailableCode: null, clinicMonthUsedPercent: 0, ...over });

const httpError = (status: number, code: string, headers?: HttpHeaders) => new HttpErrorResponse({ status, error: { title: 'x', extensions: { code } }, headers });

const NOV_19 = new Date('2026-11-19T12:00:00Z');

describe('ai-error.utils', () => {
    describe('aiEntryState', () => {
        it('izin yoksa ya da durum okunamadıysa giriş görünmez', () => {
            expect(aiEntryState(status(), false)).toEqual({ kind: 'hidden' });
            expect(aiEntryState(null, true)).toEqual({ kind: 'hidden' });
        });

        it('yapılandırılmamış ya da klinikte kapalıysa görünmez', () => {
            expect(aiEntryState(status({ isAvailable: false, unavailableCode: 'Ai.NotConfigured' }), true).kind).toBe('hidden');
            expect(aiEntryState(status({ isAvailable: false, unavailableCode: 'Ai.ClinicNotEnabled' }), true).kind).toBe('hidden');
        });

        it('kota doldu, sistem bütçesi ve klinik seçimi: soluk, nedeni yazılı', () => {
            expect(aiEntryState(status({ isAvailable: false, unavailableCode: 'Ai.ClinicQuotaExceeded' }), true, NOV_19)).toEqual({
                kind: 'disabled',
                reason: "Bu ayın AI kotası doldu · 1 Aralık'ta yenilenir"
            });
            expect(aiEntryState(status({ isAvailable: false, unavailableCode: 'Ai.SystemBudgetExhausted' }), true)).toEqual({ kind: 'disabled', reason: 'Yapay zekâ şu an kullanılamıyor' });
            expect(aiEntryState(status({ isAvailable: false, unavailableCode: 'Clinics.ClinicSelectionRequired' }), true)).toEqual({ kind: 'disabled', reason: 'Önce klinik seçin' });
        });

        it('kullanılabilir', () => {
            expect(aiEntryState(status(), true)).toEqual({ kind: 'available' });
        });
    });

    it('kota yenilenme günü İstanbul takvim ayına göre (yıl dönümü ve gece yarısı)', () => {
        expect(aiQuotaResetLabel(new Date('2026-12-05T10:00:00Z'))).toBe("1 Ocak'ta yenilenir");
        // 30 Kasım 21:30 UTC = 1 Aralık 00:30 İstanbul → yenilenme 1 Ocak.
        expect(aiQuotaResetLabel(new Date('2026-11-30T21:30:00Z'))).toBe("1 Ocak'ta yenilenir");
        expect(aiQuotaResetLabel(new Date('2026-03-10T10:00:00Z'))).toBe("1 Nisan'da yenilenir");
    });

    it('%80 ve üstünde kullanım notu, altında yok', () => {
        expect(aiUsageWarning(status({ clinicMonthUsedPercent: 79 }))).toBeNull();
        expect(aiUsageWarning(status({ clinicMonthUsedPercent: 84.4 }))).toBe('Kliniğin bu ayki AI kullanımı %84. Sınır dolunca yalnız AI özellikleri durur; diğer işler etkilenmez.');
        expect(aiUsageWarning(null)).toBeNull();
    });

    describe('aiProblemFromError', () => {
        it('429 RateLimited: tekrar denenebilir, Retry-After yoksa 60 sn', () => {
            const p = aiProblemFromError(httpError(429, 'Ai.RateLimited'), 'summary');

            expect(p).toEqual(expect.objectContaining({ title: 'Kısa sürede çok fazla istek gönderildi', retryable: true, retryAfterSeconds: 60, refreshStatus: false }));
            expect(aiProblemFromError(httpError(429, 'Ai.RateLimited', new HttpHeaders({ 'Retry-After': '42' })), 'summary').retryAfterSeconds).toBe(42);
        });

        it('kota ve bütçe: tekrar dene yok, durum yeniden sorulur', () => {
            expect(aiProblemFromError(httpError(429, 'Ai.ClinicQuotaExceeded'), 'summary', NOV_19)).toEqual(
                expect.objectContaining({ title: 'Bu ayın AI kotası doldu', message: "Kota 1 Aralık'ta yenilenir. Hasta kartı ve kayıtlar etkilenmedi.", retryable: false, refreshStatus: true })
            );
            expect(aiProblemFromError(httpError(503, 'Ai.SystemBudgetExhausted'), 'summary')).toEqual(expect.objectContaining({ retryable: false, refreshStatus: true }));
        });

        it('sağlayıcı ulaşılamadı / bozuk çıktı: tekrar denenebilir; reddetti / güvenlik: denenemez', () => {
            expect(aiProblemFromError(httpError(503, 'Ai.ProviderUnavailable'), 'summary')).toEqual(
                expect.objectContaining({ title: 'Özet şu an hazırlanamadı', message: 'Yapay zekâ hizmetine ulaşılamadı. Hasta kartı ve kayıtlar etkilenmedi; birazdan yeniden deneyebilirsiniz.', retryable: true })
            );
            expect(aiProblemFromError(httpError(502, 'Ai.InvalidOutput'), 'draft').title).toBe('Taslak şu an hazırlanamadı');
            expect(aiProblemFromError(httpError(502, 'Ai.ProviderRejected'), 'summary')).toEqual(expect.objectContaining({ message: 'Sorun sürerse destek ekibine yazın.', retryable: false }));
            expect(aiProblemFromError(httpError(422, 'Ai.Refused'), 'summary')).toEqual(expect.objectContaining({ title: 'Bu kayıtlar için özet üretilemedi', retryable: false }));
        });

        it('taslak kararı kodları', () => {
            expect(aiProblemFromError(httpError(410, 'AiDrafts.Expired'), 'draft')).toEqual(expect.objectContaining({ title: 'Taslağın süresi doldu', retryable: false }));
            expect(aiProblemFromError(httpError(409, 'AiDrafts.NotPending'), 'draft').title).toBe('Bu taslağa zaten karar verilmiş');
        });

        it('karar kaydın kuralına takılırsa (kesinleşmiş, çakışma): tekrar dene yok, taslağın beklediği yazılır', () => {
            const p = aiProblemFromError(new HttpErrorResponse({ status: 409, error: { detail: 'Muayene kesinleşmiş.', extensions: { code: 'Examinations.Finalized' } } }), 'decision');

            expect(p).toEqual(expect.objectContaining({ title: 'Taslak kayda geçirilemedi', retryable: false }));
            expect(p.message).toContain('Taslak bekliyor; hiçbir şey kaydedilmedi.');
        });

        it('kodsuz ya da HTTP olmayan hata: tekrar denenebilir genel metin, kırmızı/hata sözcüğü yok', () => {
            const net = aiProblemFromError(new HttpErrorResponse({ status: 0 }), 'summary');
            const other = aiProblemFromError(new Error('x'), 'summary');

            expect(net.retryable).toBe(true);
            expect(other).toEqual(expect.objectContaining({ code: null, title: 'Özet şu an hazırlanamadı', retryable: true }));
            expect(`${other.title} ${other.message}`.toLocaleLowerCase('tr-TR')).not.toContain('hata');
        });
    });
});
