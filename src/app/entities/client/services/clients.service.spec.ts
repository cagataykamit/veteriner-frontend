import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ClientsService } from './clients.service';

describe('ClientsService müşteri rıza ucu', () => {
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('rıza: PUT müşteri ucuna durum, tarih ve sürümle gider; yanıt yeni sürümü taşır', () => {
        const clients = TestBed.inject(ClientsService);
        let result: unknown;

        clients.updateKvkkConsent('c1', { status: 'Accepted', recordedOn: '2026-10-15', rowVersion: 'rv1' }).subscribe((r) => (result = r));
        const put = http.expectOne('http://api.test/api/v1/clients/c1/kvkk-consent');

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ status: 'Accepted', recordedOn: '2026-10-15', rowVersion: 'rv1' });
        put.flush({ id: 'c1', kvkkConsentStatus: 'Accepted', kvkkConsentRecordedOn: '2026-10-15', kvkkConsentRecordedByName: 'Ayşe', remindersOptedOut: false, rowVersion: 'rv2' });
        expect(result).toEqual({ kvkkConsent: { status: 'Accepted', recordedOn: '2026-10-15', recordedByName: 'Ayşe', templateVersion: null, templateHash: null }, remindersOptedOut: false, rowVersion: 'rv2' });
    });
});
