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

/** L-01 (kullanıcı kararı A): giriş, şifre ve klinik seçimi sayfaları ortak iskelette; kart üstünde süs çipi yok, başlık sade. */
describe('Giriş sayfalarının ortak iskeleti (L-01 A)', () => {
    const render = <T>(component: Type<T>) => {
        TestBed.configureTestingModule({
            imports: [component],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 't', email: 'ornek@klinik.test' }) }, queryParamMap: of(convertToParamMap({})) } },
                { provide: AuthService, useValue: { getMyClinics: () => NEVER, isAuthenticated: () => false, getClinicId: () => null } },
                { provide: PasswordResetService, useValue: { requestReset: () => NEVER, resetPassword: () => NEVER } }
            ]
        });
        const fixture = TestBed.createComponent(component);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    // Birim testinde genel stil dosyası yüklenmez; görünüş sınıflardan doğrulanır (renkler public-page-theme.scss'te, tek yer).
    const expectShell = (el: HTMLElement, title: string) => {
        const root = el.querySelector('app-public-auth-shell .public-auth-page');

        expect(root?.classList).toContain('public-site');
        expect(el.querySelector('a.public-auth-topbar-home[href="/"]')?.textContent).toContain('Ana sayfa');
        expect(el.querySelector('.public-auth-card h1.public-auth-title')?.textContent?.trim()).toBe(title);
        expect(el.querySelector('.public-auth-card nav.public-legal-links')).toBeNull();
        expect(el.querySelector('.public-auth-main > app-public-legal-links nav')).not.toBeNull();
        // Tıklanır görünüp tıklanmayan süs çipi ve fosforlu vurgu yok
        expect(el.querySelector('.public-auth-header [class*="chip"], .public-auth-header em, .public-auth-header mark')).toBeNull();
    };

    it('giriş: başlık, etiket, birincil düğme ve kayıt bağlantısı', () => {
        const el = render(Login);

        expectShell(el, 'Vetinity paneline giriş');
        expect(el.querySelector('label[for="email1"]')?.classList).toContain('public-auth-label');
        expect(el.querySelector('button[type="submit"]')?.classList).toContain('public-auth-submit');
        expect(el.querySelector('.public-auth-alt a[href="/auth/signup"]')?.textContent?.trim()).toBe('Hesap oluştur');
    });

    it('şifremi unuttum: başlık ve düğme cümle düzeninde', () => {
        const el = render(ForgotPasswordPageComponent);

        expectShell(el, 'Şifremi unuttum');
        expect(el.querySelector('.public-auth-submit')?.textContent).toContain('Sıfırlama bağlantısı gönder');
    });

    it('yeni şifre ve klinik seçimi aynı iskelette', () => {
        expectShell(render(ResetPasswordPageComponent), 'Yeni şifre belirleyin');
        TestBed.resetTestingModule();
        expectShell(render(SelectClinicPage), 'Klinik seçimi');
    });
});
