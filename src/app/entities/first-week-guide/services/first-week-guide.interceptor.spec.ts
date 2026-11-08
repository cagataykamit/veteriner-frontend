import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstWeekGuideInterceptor } from '@/app/entities/first-week-guide/services/first-week-guide.interceptor';
import { FirstWeekGuideService } from '@/app/entities/first-week-guide/services/first-week-guide.service';

describe('firstWeekGuideInterceptor', () => {
    let http: HttpClient;
    let controller: HttpTestingController;
    let markDone: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        markDone = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptors([firstWeekGuideInterceptor])),
                provideHttpClientTesting(),
                { provide: FirstWeekGuideService, useValue: { markDone } }
            ]
        });
        http = TestBed.inject(HttpClient);
        controller = TestBed.inject(HttpTestingController);
    });

    afterEach(() => controller.verify());

    it('kayıt başarıyla oluşunca adımı yapıldı işaretler', () => {
        http.post('http://api.test/api/v1/appointments', {}).subscribe();

        expect(markDone).not.toHaveBeenCalled();
        controller.expectOne('http://api.test/api/v1/appointments').flush({ id: 'a1' }, { status: 201, statusText: 'Created' });

        expect(markDone).toHaveBeenCalledWith(['appointment']);
    });

    it('hata yanıtında işaret koymaz', () => {
        http.post('http://api.test/api/v1/payments', {}).subscribe({ error: () => undefined });
        controller.expectOne('http://api.test/api/v1/payments').flush({ title: 'Hata' }, { status: 400, statusText: 'Bad Request' });

        expect(markDone).not.toHaveBeenCalled();
    });

    it('rehberle ilgisiz isteğe karışmaz', () => {
        http.get('http://api.test/api/v1/appointments').subscribe();
        controller.expectOne('http://api.test/api/v1/appointments').flush([]);

        expect(markDone).not.toHaveBeenCalled();
    });
});
