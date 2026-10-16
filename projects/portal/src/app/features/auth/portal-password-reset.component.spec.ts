import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { PORTAL_ERROR_CODES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, typeInto } from '@portal/app/testing/portal-testing';
import { PortalPasswordResetComponent, RESET_CODE_SENT_MESSAGE } from './portal-password-reset.component';

describe('PortalPasswordResetComponent', () => {
    let fixture: ComponentFixture<PortalPasswordResetComponent>;
    let el: HTMLElement;
    let api: jasmine.SpyObj<PortalAuthApi>;

    async function click(text: string): Promise<void> {
        buttonByText(el, text)!.click();
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        api = jasmine.createSpyObj<PortalAuthApi>('PortalAuthApi', ['requestPasswordReset', 'confirmPasswordReset']);
        api.requestPasswordReset.and.returnValue(of(undefined));
        await TestBed.configureTestingModule({
            imports: [PortalPasswordResetComponent],
            providers: [provideRouter([]), { provide: PortalAuthApi, useValue: api }]
        }).compileComponents();
        fixture = TestBed.createComponent(PortalPasswordResetComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => fixture.destroy());

    async function toConfirmStep(): Promise<void> {
        typeInto(el, '#reset-email', 'ayse@example.com');
        await click('Kod gönder');
    }

    it('kod isteği hesap varlığını ele vermez ve onay adımına geçer', async () => {
        await toConfirmStep();

        expect(api.requestPasswordReset).toHaveBeenCalledWith('ayse@example.com');
        expect(el.textContent).toContain(RESET_CODE_SENT_MESSAGE);
        expect(el.querySelector('#reset-code')).not.toBeNull();
    });

    it('zayıf ya da eşleşmeyen parolayı göndermez', async () => {
        await toConfirmStep();
        typeInto(el, '#reset-code', '123456');
        typeInto(el, '#reset-password', 'Parola12');
        typeInto(el, '#reset-password-confirm', 'Parola13');
        await click('Parolayı güncelle');

        expect(api.confirmPasswordReset).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Parola en az bir özel karakter içermeli.');
        expect(el.textContent).toContain('Parolalar aynı olmalı.');
    });

    it('başarıda tüm oturumların kapandığını söyler; geçersiz kodda Türkçe mesaj', async () => {
        api.confirmPasswordReset.and.returnValue(throwError(() => problem(401, PORTAL_ERROR_CODES.invalidCredentials)));
        await toConfirmStep();
        typeInto(el, '#reset-code', '123456');
        typeInto(el, '#reset-password', 'Guclu.Parola1');
        typeInto(el, '#reset-password-confirm', 'Guclu.Parola1');
        await click('Parolayı güncelle');

        expect(el.querySelector('[role=alert]')?.textContent).toContain('Kod doğrulanamadı');

        api.confirmPasswordReset.and.returnValue(of(undefined));
        await click('Parolayı güncelle');

        expect(api.confirmPasswordReset).toHaveBeenCalledWith('ayse@example.com', '123456', 'Guclu.Parola1');
        expect(el.textContent).toContain('tüm oturumlarınız kapatıldı');
    });
});
