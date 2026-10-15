import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { KvkkFormTemplateService } from './kvkk-form-template.service';

describe('KvkkFormTemplateService ve müşteri rıza ucu', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('şablon: GET klinik ucundan okunur, PUT kayıt yokken sürümsüz gönderilir', () => {
        const service = TestBed.inject(KvkkFormTemplateService);
        let text = '';

        service.getTemplate('k1', 'consent').subscribe((vm) => (text = vm.text));
        http.expectOne('http://api.test/api/v1/clinics/k1/kvkk-form-template').flush({ clinicId: 'k1', text: 'Yer tutucu', isDefault: true, rowVersion: null });
        expect(text).toBe('Yer tutucu');

        const saved: { rowVersion?: string | null } = {};

        service.updateTemplate('k1', 'consent', ' Yeni metin ', { isDefault: true, rowVersion: null }).subscribe((vm) => (saved.rowVersion = vm.rowVersion));
        const put = http.expectOne('http://api.test/api/v1/clinics/k1/kvkk-form-template');

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ text: 'Yeni metin', rowVersion: null });
        put.flush({ clinicId: 'k1', text: 'Yeni metin', isDefault: false, rowVersion: 'rv1' });
        expect(saved.rowVersion).toBe('rv1');
    });

    it('aydınlatma: GET ve PUT kendi ucuna gider (§2b); aynı gövde ve sürüm kuralı', () => {
        const service = TestBed.inject(KvkkFormTemplateService);
        let loaded: { text: string; isDefault: boolean } | undefined;

        service.getTemplate('k1', 'disclosure').subscribe((vm) => (loaded = { text: vm.text, isDefault: vm.isDefault }));
        const get = http.expectOne('http://api.test/api/v1/clinics/k1/kvkk-disclosure-template');

        expect(get.request.method).toBe('GET');
        get.flush({ clinicId: 'k1', text: 'Aydınlatma {{clientName}}', isDefault: true, rowVersion: null });
        expect(loaded).toEqual({ text: 'Aydınlatma {{clientName}}', isDefault: true });

        let rowVersion: string | null | undefined;

        service.updateTemplate('k1', 'disclosure', 'Onaylı aydınlatma', { isDefault: false, rowVersion: 'rv7' }).subscribe((vm) => (rowVersion = vm.rowVersion));
        const put = http.expectOne('http://api.test/api/v1/clinics/k1/kvkk-disclosure-template');

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ text: 'Onaylı aydınlatma', rowVersion: 'rv7' });
        put.flush({ clinicId: 'k1', text: 'Onaylı aydınlatma', isDefault: false, rowVersion: 'rv8' });
        expect(rowVersion).toBe('rv8');
        http.expectNone('http://api.test/api/v1/clinics/k1/kvkk-form-template');
    });

    it('rıza: PUT müşteri ucuna durum, tarih ve sürümle gider; yanıt yeni sürümü taşır', () => {
        const clients = TestBed.inject(ClientsService);
        let result: unknown;

        clients.updateKvkkConsent('c1', { status: 'Accepted', recordedOn: '2026-10-15', rowVersion: 'rv1' }).subscribe((r) => (result = r));
        const put = http.expectOne('http://api.test/api/v1/clients/c1/kvkk-consent');

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ status: 'Accepted', recordedOn: '2026-10-15', rowVersion: 'rv1' });
        put.flush({ id: 'c1', kvkkConsentStatus: 'Accepted', kvkkConsentRecordedOn: '2026-10-15', kvkkConsentRecordedByName: 'Ayşe', rowVersion: 'rv2' });
        expect(result).toEqual({ kvkkConsent: { status: 'Accepted', recordedOn: '2026-10-15', recordedByName: 'Ayşe' }, rowVersion: 'rv2' });
    });
});
