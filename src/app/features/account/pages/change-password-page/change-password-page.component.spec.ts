import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ChangePasswordPageComponent } from './change-password-page.component';

describe('ChangePasswordPageComponent', () => {
    let fixture: ComponentFixture<ChangePasswordPageComponent>;
    let cmp: ChangePasswordPageComponent;
    let http: HttpTestingController;
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChangePasswordPageComponent],
            providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ChangePasswordPageComponent);
        cmp = fixture.componentInstance;
        vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add').mockReturnValue(undefined);
        fixture.detectChanges();
        cmp.form.setValue({ currentPassword: 'Eski1234*', newPassword: 'Yeni1234*', confirmPassword: 'Yeni1234*' });
    });

    afterEach(() => http.verify());

    it('başarılı değişiklikten sonra Hesabım sayfasına onay parametresiyle döner', () => {
        cmp.onSubmit();
        http.expectOne('http://api.test/api/v1/me/change-password').flush(null, { status: 200, statusText: 'OK' });

        expect(navigate).toHaveBeenCalledWith(['/panel/settings/account'], { queryParams: { passwordChanged: '1' } });
        expect(cmp.saving()).toBe(false);
    });

    it('hata olursa sayfada kalır', () => {
        cmp.onSubmit();
        http.expectOne('http://api.test/api/v1/me/change-password').flush({ detail: 'Mevcut şifre hatalı.' }, { status: 400, statusText: 'Bad Request' });

        expect(navigate).not.toHaveBeenCalled();
        expect(cmp.saving()).toBe(false);
    });
});
