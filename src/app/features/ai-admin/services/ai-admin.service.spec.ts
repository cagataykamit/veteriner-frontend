import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { aiMonthLabel, aiRecentMonths, formatAiNumber, formatAiUsd } from '@/app/features/ai-admin/models/ai-admin.model';
import { AiAdminService } from '@/app/features/ai-admin/services/ai-admin.service';

const base = 'http://api.test/api/v1/admin/ai';

describe('AiAdminService', () => {
    let service: AiAdminService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(AiAdminService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('kullanım: ay verilirse ?month=, verilmezse parametresiz', () => {
        service.usage('2026-10').subscribe();
        http.expectOne((r) => r.url === `${base}/usage` && r.params.get('month') === '2026-10').flush({});

        service.usage().subscribe();
        http.expectOne((r) => r.url === `${base}/usage` && !r.params.has('month')).flush({});
    });

    it('klinikler: arama kırpılır; boşsa parametresiz', () => {
        service.clinics('  Pati ').subscribe();
        http.expectOne((r) => r.url === `${base}/clinics` && r.params.get('search') === 'Pati').flush([]);

        service.clinics('   ').subscribe();
        http.expectOne((r) => r.url === `${base}/clinics` && !r.params.has('search')).flush([]);
    });

    it('aç/kapat PUT, fon ekleme POST ve hareketler GET', () => {
        service.setEnabled('c 1', true).subscribe();
        const put = http.expectOne({ method: 'PUT', url: `${base}/clinics/c%201` });

        expect(put.request.body).toEqual({ isEnabled: true });
        put.flush({});

        service.grantFund('c1', 250, null).subscribe();
        const post = http.expectOne({ method: 'POST', url: `${base}/clinics/c1/fund-grants` });

        expect(post.request.body).toEqual({ credits: 250, note: null });
        post.flush({});

        service.fundGrants('c1').subscribe();
        http.expectOne({ method: 'GET', url: `${base}/clinics/c1/fund-grants` }).flush([]);
    });

    it('sunucu hatası Türkçe iletiye çevrilir', async () => {
        const p = firstValueFrom(service.setEnabled('c1', true)).catch((e: Error) => e.message);

        http.expectOne(`${base}/clinics/c1`).flush({ title: 'x', extensions: { code: 'Ai.ClinicNotFound' } }, { status: 404, statusText: 'Not Found' });
        expect(await p).toBe('Klinik bulunamadı.');
    });
});

describe('ai-admin model yardımcıları', () => {
    it('son aylar İstanbul takvimiyle, yıl geçişiyle', () => {
        // 31 Aralık 22:30 UTC = 1 Ocak 01:30 İstanbul
        const months = aiRecentMonths(3, new Date('2026-12-31T22:30:00Z'));

        expect(months.map((m) => m.value)).toEqual(['2027-01', '2026-12', '2026-11']);
        expect(months[0].label).toBe('Ocak 2027');
        expect(aiMonthLabel('bozuk')).toBe('bozuk');
    });

    it('küçük dolar tutarları dört ondalıkla, kredi aşağı yuvarlanarak', () => {
        expect(formatAiUsd(0.00027)).toContain('0,0003');
        expect(formatAiUsd(10)).toContain('10,00');
        expect(formatAiNumber(1999.9)).toBe('1.999');
        expect(formatAiNumber(12.36, 1)).toBe('12,4');
    });
});
