import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PORTAL_ERROR_CODES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem, typeInto } from '@portal/app/testing/portal-testing';
import { CLINIC, configurePortalPage, createSessionStub, LINK_MERKEZ, LINK_SAHIL, url } from '@portal/app/testing/portal-fixtures';
import { DELETION_CODE_SENT_MESSAGE, PortalAccountDeletionComponent } from './portal-account-deletion.component';

describe('PortalAccountDeletionComponent (hesabı sil)', () => {
    let fixture: ComponentFixture<PortalAccountDeletionComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let router: Router;
    const deleteAccount = vi.fn().mockName('PortalSessionService.deleteAccount');

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function click(text: string): Promise<void> {
        buttonByText(el, text)!.click();
        await settle();
    }

    async function toConfirmStep(): Promise<void> {
        await click('Onay kodu gönder');
        http.expectOne(url('me/deletion-code')).flush(null, { status: 204, statusText: 'No Content' });
        await settle();
    }

    beforeEach(async () => {
        deleteAccount.mockReset();
        configurePortalPage(PortalAccountDeletionComponent, { ...createSessionStub([LINK_MERKEZ, LINK_SAHIL]), deleteAccount } as never);
        http = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(PortalAccountDeletionComponent);
        el = fixture.nativeElement;
        await settle();
        http.expectOne(url('links/' + LINK_MERKEZ.linkId + '/clinic')).flush(CLINIC);
        http.expectOne(url('links/' + LINK_SAHIL.linkId + '/clinic')).flush(null, { status: 404, statusText: 'Not Found' });
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('silinecekleri, kalanları ve bağlı kliniklerin iletişimini gösterir', () => {
        expect(el.textContent).toContain('E-posta adresiniz, parolanız ve adınız');
        expect(el.textContent).toContain('kliniğin sorumluluğundadır ve bu işlemle silinmez');
        expect(el.textContent).toContain('geri alınamaz');

        const clinics = Array.from(el.querySelectorAll('[data-testid=deletion-clinic]'));

        expect(clinics).toHaveLength(2);
        expect(clinics[0].querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:03125550000');
        expect(clinics[0].querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe('mailto:merkez@example.com');
        expect(clinics[1].textContent).toContain('Sahil');
        expect(clinics[1].querySelector('a')).toBeNull();
    });

    it('onay kutusu işaretlenmeden silmez; başarıda girişe "silindi" ile döner', async () => {
        await toConfirmStep();

        expect(el.textContent).toContain(DELETION_CODE_SENT_MESSAGE);

        typeInto(el, '#deletion-code', '123 456');
        await click('Hesabımı kalıcı olarak sil');

        expect(deleteAccount).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Devam etmek için onay kutusunu işaretleyin.');

        deleteAccount.mockReturnValue(of(undefined));
        el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
        await click('Hesabımı kalıcı olarak sil');

        expect(deleteAccount).toHaveBeenCalledWith('123456');
        expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'deleted' }, replaceUrl: true });
    });

    it('geçersiz kodda Türkçe mesaj; oturum korunur', async () => {
        deleteAccount.mockReturnValue(throwError(() => problem(400, PORTAL_ERROR_CODES.deletionCodeInvalid)));
        await toConfirmStep();
        typeInto(el, '#deletion-code', '000000');
        el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
        await click('Hesabımı kalıcı olarak sil');

        expect(el.querySelector('[role=alert]')?.textContent).toContain('Onay kodu doğrulanamadı');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(buttonByText(el, 'Kodu tekrar gönder')?.disabled).toBe(true);
    });
});
