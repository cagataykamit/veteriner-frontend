import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, TEST_ME, testTokens, typeInto } from '@portal/app/testing/portal-testing';
import { PortalInviteApi, PortalInvitePreview } from './portal-invite.api';
import { PortalInviteComponent } from './portal-invite.component';

const NEW_ACCOUNT: PortalInvitePreview = {
    clinicName: 'Merkez Veteriner',
    emailMasked: 'a***@example.com',
    expiresAtUtc: '2026-10-23T10:00:00Z',
    hasAccount: false,
    requiredLegalDocuments: [
        { documentType: 'PortalTerms', version: '0.1' },
        { documentType: 'PortalPrivacy', version: '0.1' }
    ]
};

describe('PortalInviteComponent (davet akışı)', () => {
    let fixture: ComponentFixture<PortalInviteComponent>;
    let el: HTMLElement;
    let api: jasmine.SpyObj<PortalInviteApi>;
    let session: jasmine.SpyObj<PortalSessionService>;
    let router: Router;

    async function create(token: string | undefined, preview$ = of(NEW_ACCOUNT)): Promise<void> {
        api.preview.and.returnValue(preview$);
        fixture = TestBed.createComponent(PortalInviteComponent);
        fixture.componentRef.setInput('token', token);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function consent(): void {
        const box = el.querySelector<HTMLInputElement>('portal-legal-consent input[type=checkbox]')!;

        box.click();
    }

    async function submit(): Promise<void> {
        buttonByText(el, 'Daveti kabul et')!.click();
        await settle();
    }

    beforeEach(async () => {
        api = jasmine.createSpyObj<PortalInviteApi>('PortalInviteApi', ['preview', 'accept']);
        session = jasmine.createSpyObj<PortalSessionService>('PortalSessionService', ['startSession', 'selectLink']);
        session.startSession.and.returnValue(of(TEST_ME));
        await TestBed.configureTestingModule({
            imports: [PortalInviteComponent],
            providers: [provideRouter([]), { provide: PortalInviteApi, useValue: api }, { provide: PortalSessionService, useValue: session }]
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
    });

    afterEach(() => fixture?.destroy());

    it('token yoksa istek atmadan geçersiz davet mesajı gösterir', async () => {
        await create(undefined);

        expect(api.preview).not.toHaveBeenCalled();
        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.inviteNotFound]);
    });

    it('404 davette sebep ayırt etmeden geçersiz mesajı gösterir', async () => {
        await create('tok', throwError(() => problem(404, PORTAL_ERROR_CODES.inviteNotFound)));

        expect(el.textContent).toContain('Davet geçersiz');
        expect(el.querySelector('form')).toBeNull();
    });

    it('önizlemede klinik adı, maskeli e-posta ve belge sürümlerini gösterir', async () => {
        await create('tok');

        expect(api.preview).toHaveBeenCalledWith('tok');
        expect(el.textContent).toContain('Merkez Veteriner');
        expect(el.textContent).toContain('a***@example.com');
        expect(el.textContent).toContain('Kullanım Şartları (sürüm 0.1)');
        expect(el.textContent).toContain('Gizlilik Politikası (sürüm 0.1)');
    });

    it('belgeler onaylanmadan kabul isteği gönderilmez (engelleyici)', async () => {
        await create('tok');
        await submit();

        expect(api.accept).not.toHaveBeenCalled();
        expect(el.textContent).toContain('belgeleri okuyup onaylamanız gerekiyor');
    });

    it('kodla giriş seçiliyken parolasız kabul eder, oturum açar ve adres çubuğundaki daveti bırakır', async () => {
        api.accept.and.returnValue(of({ linkId: 'link-9', ...testTokens(1) }));
        await create('tok');
        typeInto(el, '#invite-display-name', '  Ayşe  ');
        consent();
        await submit();

        expect(api.accept).toHaveBeenCalledWith('tok', { displayName: 'Ayşe', acceptedLegalDocuments: NEW_ACCOUNT.requiredLegalDocuments });
        expect(session.selectLink).toHaveBeenCalledWith('link-9');
        expect(session.startSession).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('parola seçilince güçlü parola ve eşleşme doğrulanır', async () => {
        api.accept.and.returnValue(of({ linkId: 'link-9', ...testTokens(1) }));
        await create('tok');
        el.querySelector<HTMLInputElement>('input[type=radio][value=password]')!.click();
        await settle();
        typeInto(el, '#invite-password', 'zayif');
        typeInto(el, '#invite-password-confirm', 'farkli');
        consent();
        await submit();

        expect(api.accept).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Parola en az 8 karakter olmalı.');
        expect(el.textContent).toContain('Parolalar aynı olmalı.');

        typeInto(el, '#invite-password', 'Guclu.Parola1');
        typeInto(el, '#invite-password-confirm', 'Guclu.Parola1');
        await submit();

        expect(api.accept).toHaveBeenCalledWith('tok', { password: 'Guclu.Parola1', acceptedLegalDocuments: NEW_ACCOUNT.requiredLegalDocuments });
    });

    it('hesabı olan kullanıcıdan ad ve parola istemez', async () => {
        api.accept.and.returnValue(of({ linkId: 'link-9', ...testTokens(1) }));
        await create('tok', of({ ...NEW_ACCOUNT, hasAccount: true, requiredLegalDocuments: [] }));

        expect(el.querySelector('#invite-display-name')).toBeNull();
        expect(el.querySelector('input[type=radio]')).toBeNull();
        expect(el.querySelector('portal-legal-consent')).toBeNull();

        await submit();

        expect(api.accept).toHaveBeenCalledWith('tok', { acceptedLegalDocuments: [] });
    });

    it('sunucu hatasını Türkçe mesajla gösterir', async () => {
        api.accept.and.returnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.alreadyLinked)));
        await create('tok');
        consent();
        await submit();

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.alreadyLinked]);
        expect(session.startSession).not.toHaveBeenCalled();
    });
});
