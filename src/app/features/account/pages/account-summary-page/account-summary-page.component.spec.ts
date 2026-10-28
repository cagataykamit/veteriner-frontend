import type { Mock } from 'vitest';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AccountSummaryPageComponent } from './account-summary-page.component';

const summary = { userId: 'u1', email: 'ali.veli@x.com', displayName: 'ali.veli', roles: ['Veteriner'], isTenantWide: false };

describe('AccountSummaryPageComponent (görünen ad)', () => {
    let fixture: ComponentFixture<AccountSummaryPageComponent>;
    let cmp: AccountSummaryPageComponent;
    let http: HttpTestingController;
    let toasts: Mock;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSummaryPageComponent],
            providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AccountSummaryPageComponent);
        cmp = fixture.componentInstance;
        toasts = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add').mockReturnValue(undefined);
        fixture.detectChanges();
        http.expectOne('http://api.test/api/v1/me/account-summary').flush(summary);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    it('mevcut ad alana yüklenir ve değişmeden kaydet kapalıdır', () => {
        expect(cmp.displayNameControl.value).toBe('ali.veli');
        expect(cmp.displayNameControl.pristine).toBe(true);
    });

    it('kaydet: kırpılmış ad PUT edilir, özet güncellenir, toast gösterilir', () => {
        cmp.displayNameControl.setValue('  Dr. Ayşe Yılmaz ');
        cmp.displayNameControl.markAsDirty();
        cmp.saveDisplayName();

        const req = http.expectOne('http://api.test/api/v1/me/display-name');

        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ displayName: 'Dr. Ayşe Yılmaz' });
        req.flush(null, { status: 204, statusText: 'No Content' });

        expect(cmp.summary()?.displayName).toBe('Dr. Ayşe Yılmaz');
        expect(cmp.displayNameControl.pristine).toBe(true);
        expect(vi.mocked(toasts).mock.lastCall![0]).toEqual(expect.objectContaining({ severity: 'success' }));
    });

    it('boş değer adı temizler (displayName: null)', () => {
        cmp.displayNameControl.setValue('   ');
        cmp.saveDisplayName();
        const req = http.expectOne('http://api.test/api/v1/me/display-name');

        expect(req.request.body).toEqual({ displayName: null });
        req.flush(null, { status: 204, statusText: 'No Content' });
        expect(cmp.summary()?.displayName).toBeNull();
    });

    it('120 karakterden uzun ad gönderilmez', () => {
        cmp.displayNameControl.setValue('a'.repeat(121));
        cmp.saveDisplayName();
        http.expectNone('http://api.test/api/v1/me/display-name');
    });

    it('çift tıklama: yanıt gelmeden ikinci PUT gitmez; hata mesajı gösterilir', () => {
        cmp.displayNameControl.setValue('Dr. Ayşe');
        cmp.saveDisplayName();
        cmp.saveDisplayName();
        const req = http.expectOne('http://api.test/api/v1/me/display-name');

        req.flush({ detail: 'Ad geçersiz.' }, { status: 400, statusText: 'Bad Request' });

        expect(cmp.displayNameSaving()).toBe(false);
        expect(cmp.displayNameError()).toBe('Ad geçersiz.');
    });

    it('onay parametresi yoksa şifre mesajı görünmez', () => {
        expect(cmp.showPasswordChangedBanner()).toBe(false);
    });
});

describe('AccountSummaryPageComponent (şifre değiştirme dönüşü)', () => {
    it('passwordChanged=1 ile gelince onay gösterilir ve parametre temizlenir', async () => {
        await TestBed.configureTestingModule({
            imports: [AccountSummaryPageComponent],
            providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        }).compileComponents();
        const router = TestBed.inject(Router);

        await router.navigateByUrl('/?passwordChanged=1');
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const fixture = TestBed.createComponent(AccountSummaryPageComponent);

        vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add').mockReturnValue(undefined);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController).expectOne('http://api.test/api/v1/me/account-summary').flush(summary);
        fixture.detectChanges();

        expect(fixture.componentInstance.showPasswordChangedBanner()).toBe(true);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Şifreniz güncellendi.');
        expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { passwordChanged: null }, replaceUrl: true }));
    });
});
