import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, PORTAL_RATE_LIMIT_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, TEST_ME, testTokens, typeInto } from '@portal/app/testing/portal-testing';
import { LOGIN_CODE_INVALID_MESSAGE, LOGIN_CODE_SENT_MESSAGE, LOGIN_PASSWORD_INVALID_MESSAGE, PortalLoginComponent } from './portal-login.component';

describe('PortalLoginComponent (kod ve parola girişi)', () => {
    let fixture: ComponentFixture<PortalLoginComponent>;
    let el: HTMLElement;
    let api: jasmine.SpyObj<PortalAuthApi>;
    let session: jasmine.SpyObj<PortalSessionService>;
    let router: Router;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function click(text: string): Promise<void> {
        const button = buttonByText(el, text);

        if (!button) {
            throw new Error(`Düğme yok: ${text}`);
        }

        button.click();
        await settle();
    }

    beforeEach(async () => {
        api = jasmine.createSpyObj<PortalAuthApi>('PortalAuthApi', ['requestCode', 'verifyCode', 'login']);
        session = jasmine.createSpyObj<PortalSessionService>('PortalSessionService', ['startSession']);
        session.startSession.and.returnValue(of(TEST_ME));
        await TestBed.configureTestingModule({
            imports: [PortalLoginComponent],
            providers: [provideRouter([]), { provide: PortalAuthApi, useValue: api }, { provide: PortalSessionService, useValue: session }]
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(PortalLoginComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => fixture.destroy());

    it('e-posta boş veya geçersizse kod istemez', async () => {
        await click('Kod gönder');

        expect(el.textContent).toContain('E-posta adresinizi girin.');

        typeInto(el, '#login-email', 'gecersiz');
        await click('Kod gönder');

        expect(el.textContent).toContain('Geçerli bir e-posta adresi girin.');
        expect(api.requestCode).not.toHaveBeenCalled();
    });

    it('kod isteğinde hesabın varlığını ele vermeyen bilgi gösterir ve kod alanını açar', async () => {
        api.requestCode.and.returnValue(of(undefined));
        typeInto(el, '#login-email', ' ayse@example.com ');
        await click('Kod gönder');

        expect(api.requestCode).toHaveBeenCalledWith('ayse@example.com');
        expect(el.textContent).toContain(LOGIN_CODE_SENT_MESSAGE);
        expect(el.querySelector('#login-code')).not.toBeNull();
        expect(buttonByText(el, 'Kodu tekrar gönder')?.disabled).toBeTrue();
    });

    it('kod 6 haneli değilse doğrulamaz; doğru biçimde boşlukları atarak gönderir', async () => {
        api.requestCode.and.returnValue(of(undefined));
        api.verifyCode.and.returnValue(of(testTokens(1)));
        typeInto(el, '#login-email', 'ayse@example.com');
        await click('Kod gönder');

        typeInto(el, '#login-code', '12a4');
        await click('Doğrula ve giriş yap');

        expect(el.textContent).toContain('Kod 6 haneli bir sayı olmalı.');
        expect(api.verifyCode).not.toHaveBeenCalled();

        typeInto(el, '#login-code', '123 456');
        await click('Doğrula ve giriş yap');

        expect(api.verifyCode).toHaveBeenCalledWith('ayse@example.com', '123456');
        expect(session.startSession).toHaveBeenCalledWith(testTokens(1));
        expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('yanlış kodda kod/kilit ayrımı yapmayan mesaj gösterir', async () => {
        api.requestCode.and.returnValue(of(undefined));
        api.verifyCode.and.returnValue(throwError(() => problem(401, PORTAL_ERROR_CODES.invalidCredentials)));
        typeInto(el, '#login-email', 'ayse@example.com');
        await click('Kod gönder');
        typeInto(el, '#login-code', '000000');
        await click('Doğrula ve giriş yap');

        expect(el.querySelector('[role=alert]')?.textContent).toContain(LOGIN_CODE_INVALID_MESSAGE);
        expect(session.startSession).not.toHaveBeenCalled();
    });

    it('parola girişinde boş parolayı engeller, hatalı girişte Türkçe mesaj gösterir', async () => {
        api.login.and.returnValue(throwError(() => problem(401, PORTAL_ERROR_CODES.invalidCredentials)));
        await click('Parola');
        typeInto(el, '#login-email', 'ayse@example.com');
        await click('Giriş yap');

        expect(el.textContent).toContain('Parolanızı girin.');
        expect(api.login).not.toHaveBeenCalled();

        typeInto(el, '#login-password', 'Yanlis.Parola1');
        await click('Giriş yap');

        expect(api.login).toHaveBeenCalledWith('ayse@example.com', 'Yanlis.Parola1');
        expect(el.querySelector('[role=alert]')?.textContent).toContain(LOGIN_PASSWORD_INVALID_MESSAGE);
    });

    it('başarılı parola girişinde yalnız uygulama içi dönüş adresine gider', async () => {
        api.login.and.returnValue(of(testTokens(1)));
        fixture.componentRef.setInput('returnUrl', '//evil.example');
        await click('Parola');
        typeInto(el, '#login-email', 'ayse@example.com');
        typeInto(el, '#login-password', 'Guclu.Parola1');
        await click('Giriş yap');

        expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('hız sınırında bekleme mesajı gösterir', async () => {
        api.requestCode.and.returnValue(throwError(() => problem(429)));
        typeInto(el, '#login-email', 'ayse@example.com');
        await click('Kod gönder');

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_RATE_LIMIT_MESSAGE);
    });

    it('oturum süresi dolduğu için gelindiyse bunu söyler', async () => {
        fixture.componentRef.setInput('reason', 'expired');
        await settle();

        expect(el.textContent).toContain('Oturumunuzun süresi doldu');
    });
});
