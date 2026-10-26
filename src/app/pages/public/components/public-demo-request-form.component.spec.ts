import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { PublicDemoRequestFormComponent } from './public-demo-request-form.component';

describe('PublicDemoRequestFormComponent (TRIAL-005)', () => {
    let fixture: ComponentFixture<PublicDemoRequestFormComponent>;
    let component: PublicDemoRequestFormComponent;
    let http: HttpTestingController;

    const url = 'http://api.test/api/v1/public/demo-requests';
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [PublicDemoRequestFormComponent],
            providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        fixture = TestBed.createComponent(PublicDemoRequestFormComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    function fillValid(): void {
        Object.assign(component.form, {
            contactName: 'Ayşe Yılmaz',
            clinicName: 'Işık Veteriner',
            email: 'ayse@example.com',
            clinicSize: 'SmallTeam',
            privacyNoticeAccepted: true
        });
    }

    it('20 dakikalık görüntülü görüşme vaadini, gizli tuzak alanı ve gizlilik bağlantısını gösterir', () => {
        expect(root().textContent).toContain('20 dakikalık görüntülü görüşme');
        expect(root().querySelector('[aria-hidden="true"] input[name="website"]')).not.toBeNull();
        expect(root().querySelector('a[href="/gizlilik"]')).not.toBeNull();
    });

    it('geçersiz formda istek atmaz, alan hatalarını gösterir', () => {
        component.submit();
        fixture.detectChanges();

        http.expectNone(url);
        expect(component.errors().contactName).toBeTruthy();
        expect(root().textContent).toContain('Klinik büyüklüğünü seçin.');
    });

    it('geçerli formda sözleşme gövdesini gönderir ve 204 sonrası onay mesajı gösterir', () => {
        fillValid();
        component.submit();

        const req = http.expectOne(url);

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(expect.objectContaining({ contactName: 'Ayşe Yılmaz', clinicSize: 'SmallTeam', city: null, website: null, privacyNoticeAccepted: true }));
        req.flush(null, { status: 204, statusText: 'No Content' });
        fixture.detectChanges();

        expect(component.sent()).toBe(true);
        expect(root().querySelector('[role="status"]')?.textContent).toContain('Talebiniz alındı');
        expect(root().querySelector('form')).toBeNull();
    });

    it('429 yanıtında anlaşılır mesaj gösterir, form kalır', () => {
        fillValid();
        component.submit();

        http.expectOne(url).flush({ code: 'RateLimit.Exceeded' }, { status: 429, statusText: 'Too Many Requests' });
        fixture.detectChanges();

        expect(component.sent()).toBe(false);
        expect(root().querySelector('[role="alert"]')?.textContent).toContain('birkaç dakika sonra');
        expect(component.submitting()).toBe(false);
    });
});
