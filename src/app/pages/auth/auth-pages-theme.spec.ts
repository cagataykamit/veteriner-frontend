import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';
import { Login } from './login';
import { PasswordResetService } from './password-reset.service';
import { ResetPasswordPageComponent } from './reset-password-page.component';
import { SelectClinicPage } from './select-clinic';

/** L-01: giriş, şifre ve klinik seçimi sayfaları tanıtımın sıcak dilini tek yerden alır (`public-site` değişkenleri, ortak kart). */
describe('Giriş sayfalarının görsel dili (L-01)', () => {
    const render = <T>(component: Type<T>) => {
        TestBed.configureTestingModule({
            imports: [component],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 't', email: 'a@b.c' }) }, queryParamMap: of(convertToParamMap({})) } },
                { provide: AuthService, useValue: { getMyClinics: () => NEVER, isAuthenticated: () => false, getClinicId: () => null } },
                { provide: PasswordResetService, useValue: { requestReset: () => NEVER, resetPassword: () => NEVER } }
            ]
        });
        const fixture = TestBed.createComponent(component);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    // Birim testinde genel stil dosyası yüklenmez; görünüş sınıflardan doğrulanır (renkler public-page-theme.scss'te, tek yer).
    const expectWarmShell = (el: HTMLElement) => {
        const root = el.querySelector('.public-auth-page') as HTMLElement;
        const card = el.querySelector('.public-auth-card-inner') as HTMLElement;

        expect(root.classList).toContain('public-site');
        expect(root.className).not.toMatch(/bg-surface/);
        expect(card.className).not.toMatch(/bg-surface|py-20|px-20/);
        expect(el.querySelector('.public-auth-title')).not.toBeNull();
    };

    it('giriş: ortak kabuk, etiket ve birincil düğme sınıfı', () => {
        const el = render(Login);

        expectWarmShell(el);
        expect(el.querySelector('label[for="email1"]')?.classList).toContain('public-auth-label');
        expect(el.querySelector('button[type="submit"]')?.classList).toContain('public-auth-submit');
    });
    it('şifremi unuttum: aynı kabuk; başlık ve düğme cümle düzeninde', () => {
        const el = render(ForgotPasswordPageComponent);

        expectWarmShell(el);
        expect(el.querySelector('.public-auth-title')?.textContent?.trim()).toBe('Şifremi unuttum');
        expect(el.querySelector('.public-auth-submit')?.textContent).toContain('Sıfırlama bağlantısı gönder');
    });

    it('yeni şifre ve klinik seçimi aynı kabukta', () => {
        expectWarmShell(render(ResetPasswordPageComponent));
        TestBed.resetTestingModule();
        const el = render(SelectClinicPage);

        expectWarmShell(el);
        expect(el.querySelector('.public-auth-title')?.textContent?.trim()).toBe('Klinik seçimi');
    });
});
