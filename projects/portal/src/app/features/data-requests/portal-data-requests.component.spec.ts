import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { configurePortalPage, createSessionStub, LINK_MERKEZ, LINK_SAHIL, url, type PortalSessionStub } from '@portal/app/testing/portal-fixtures';
import type { PortalDataRequest } from './portal-data-requests.api';
import { PortalDataRequestsComponent } from './portal-data-requests.component';

function dataRequest(overrides: Partial<PortalDataRequest> = {}): PortalDataRequest {
    return {
        id: 'dr-1',
        type: 'Access',
        status: 'Open',
        message: 'Kayıtlarımın kopyasını istiyorum.',
        createdAtUtc: '2026-10-16T08:00:00Z',
        dueAtUtc: '2026-11-15T08:00:00Z',
        respondedAtUtc: null,
        responseNote: null,
        canCancel: true,
        ...overrides
    };
}

describe('PortalDataRequestsComponent (KVKK veri talebi)', () => {
    let fixture: ComponentFixture<PortalDataRequestsComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let session: PortalSessionStub;

    const listUrl = (linkId = LINK_MERKEZ.linkId) => url(`links/${linkId}/data-requests`);
    const cancelUrl = (id: string) => url(`links/${LINK_MERKEZ.linkId}/data-requests/${id}/cancel`);

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function chooseType(type: string): void {
        const radio = el.querySelector<HTMLInputElement>(`input[type=radio][value=${type}]`)!;

        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
    }

    function typeMessage(value: string): void {
        const area = el.querySelector<HTMLTextAreaElement>('#data-request-message')!;

        area.value = value;
        area.dispatchEvent(new Event('input'));
    }

    function submit(): void {
        el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    }

    beforeEach(async () => {
        session = createSessionStub([LINK_MERKEZ, LINK_SAHIL]);
        configurePortalPage(PortalDataRequestsComponent, session);
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalDataRequestsComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('bilgi metni kliniği, 30 günü ve hesap silmenin ayrı olduğunu söyler; geçmiş talepler listelenir', async () => {
        http.expectOne(listUrl()).flush([
            dataRequest(),
            dataRequest({
                id: 'dr-2',
                type: 'Erasure',
                status: 'Completed',
                canCancel: false,
                respondedAtUtc: '2026-10-20T08:00:00Z',
                responseNote: 'Yasal süre dolan kayıtlar silindi.'
            })
        ]);
        await settle();

        const info = el.querySelector('[data-testid=data-request-info]')!.textContent!;

        expect(info).toContain('Merkez kliniğindeki kayıtlarınız');
        expect(info).toContain('30 gün');
        expect(el.querySelector('[data-testid=account-delete-link]')?.getAttribute('href')).toBe('/account/delete');

        const rows = el.querySelectorAll('[data-testid=data-request-list] li');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Erişim');
        expect(rows[0].textContent).toContain('Kliniğe iletildi');
        expect(rows[0].querySelector('[data-testid=data-request-due]')?.textContent).toContain('15 Kasım 2026');
        expect(rows[1].textContent).toContain('Silme');
        expect(rows[1].textContent).toContain('Yanıtlandı');
        expect(rows[1].querySelector('[data-testid=data-request-due]')).toBeNull();
        expect(rows[1].querySelector('[data-testid=data-request-response]')?.textContent).toContain('Yasal süre dolan kayıtlar silindi.');
        expect(buttonByText(rows[1] as HTMLElement, 'Talebi geri çek')).toBeUndefined();
    });

    it('tür ve açıklama zorunludur; gönderimde POST {type, message} ve yeni talep listenin başına eklenir', async () => {
        http.expectOne(listUrl()).flush([]);
        await settle();

        submit();
        await settle();
        http.expectNone(listUrl());
        expect(el.textContent).toContain('Talep türünü seçin.');
        expect(el.textContent).toContain('Talebinizi kısaca açıklayın.');

        chooseType('Rectification');
        typeMessage('  Telefon numaram yanlış kayıtlı.  ');
        await settle();
        submit();

        const post = http.expectOne(listUrl());

        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual({ type: 'Rectification', message: 'Telefon numaram yanlış kayıtlı.' });
        post.flush(dataRequest({ id: 'dr-9', type: 'Rectification', message: 'Telefon numaram yanlış kayıtlı.' }));
        await settle();

        expect(el.querySelector('[data-testid=data-request-list] li')?.textContent).toContain('Düzeltme');
        expect(el.querySelector('[data-testid=data-request-status]')?.textContent).toContain('Merkez kliniğine iletildi');
        expect(el.querySelector<HTMLTextAreaElement>('#data-request-message')!.value).toBe('');
    });

    it('açık talep sınırında sözleşme mesajı gösterilir', async () => {
        http.expectOne(listUrl()).flush([]);
        await settle();

        chooseType('Other');
        typeMessage('Bir sorum var.');
        submit();
        http.expectOne(listUrl()).flush(
            { status: 409, extensions: { code: PORTAL_ERROR_CODES.dataRequestsTooManyOpen } },
            { status: 409, statusText: 'Conflict' }
        );
        await settle();

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.dataRequestsTooManyOpen]);
    });

    it('açık talep onayla geri çekilir: POST cancel, satır "Geri çekildi" olur', async () => {
        http.expectOne(listUrl()).flush([dataRequest()]);
        await settle();

        buttonByText(el, 'Talebi geri çek')!.click();
        await settle();
        buttonByText(el, 'Evet, geri çek')!.click();

        const req = http.expectOne(cancelUrl('dr-1'));

        expect(req.request.method).toBe('POST');
        req.flush(null, { status: 204, statusText: 'No Content' });
        await settle();

        expect(el.querySelector('[data-testid=data-request-list] li')?.textContent).toContain('Geri çekildi');
        expect(buttonByText(el, 'Talebi geri çek')).toBeUndefined();
    });

    it('talep artık açık değilse liste yeniden okunur ve mesaj gösterilir', async () => {
        http.expectOne(listUrl()).flush([dataRequest()]);
        await settle();

        buttonByText(el, 'Talebi geri çek')!.click();
        await settle();
        buttonByText(el, 'Evet, geri çek')!.click();
        http.expectOne(cancelUrl('dr-1')).flush({ status: 409, extensions: { code: PORTAL_ERROR_CODES.dataRequestNotOpen } }, { status: 409, statusText: 'Conflict' });
        await settle();

        http.expectOne(listUrl()).flush([dataRequest({ status: 'InProgress', canCancel: false })]);
        await settle();

        expect(el.textContent).toContain('İnceleniyor');
        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.dataRequestNotOpen]);
    });

    it('klinik değişince seçili bağın talepleri okunur', async () => {
        http.expectOne(listUrl()).flush([dataRequest()]);
        await settle();

        session.activeLink.set(LINK_SAHIL);
        await settle();
        http.expectOne(listUrl(LINK_SAHIL.linkId)).flush([]);
        await settle();

        expect(el.textContent).toContain('Bu klinikte henüz bir veri talebiniz yok.');
    });
});
