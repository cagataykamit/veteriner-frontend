import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { PetsService } from './pets.service';

describe('PetsService (açık işler)', () => {
    let service: PetsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(PetsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('GET /pets/{id}/open-items tek istek; bölüm durumları VM e eşlenir', () =>
        new Promise<void>((done) => {
            service.getPetOpenItems('p1').subscribe((vm) => {
                expect(vm.vaccinations.state).toBe('Empty');
                expect(vm.pendingCharges).toEqual({ state: 'Ok', data: { count: 2, totalAmount: 120, unpricedCount: 0, currency: 'TRY' } });
                expect(vm.outstanding.state).toBe('Forbidden');
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/pets/p1/open-items');

            expect(req.request.method).toBe('GET');
            req.flush({
                petId: 'p1',
                vaccinations: { state: 'Empty', data: null },
                labResults: { state: 'Empty', data: null },
                pendingCharges: { state: 'Ok', data: { count: 2, totalAmount: 120, unpricedCount: 0, currency: 'TRY' } },
                nextAppointment: { state: 'Empty', data: null },
                outstanding: { state: 'Forbidden', data: null }
            });
        }));

    it('istek hatası Türkçe mesajlı Error olur', () =>
        new Promise<void>((done) => {
            service.getPetOpenItems('p1').subscribe({
                error: (e: Error) => {
                    expect(e.message).toBeTruthy();
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/pets/p1/open-items').flush({ title: 'Server Error' }, { status: 500, statusText: 'Server Error' });
        }));
});
