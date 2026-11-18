import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { EDocumentDto, EDocumentPreviewDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { E_DOCUMENT_SETUP_ISSUE, eDocumentReturnLabel, eDocumentSetupDoneValue, eDocumentStatusLabel, eDocumentTypeLabel, isEDocumentPending } from '@/app/entities/e-document/utils/e-document-labels';
import { clearEDocumentResume, readEDocumentResume } from '@/app/entities/e-document/utils/e-document-resume';
import { EDocumentIssueDialogComponent, issueErrorMessage } from './e-document-issue-dialog.component';

const preview: EDocumentPreviewDto = {
    clientId: 'cl1',
    clientName: 'Ayşe Yılmaz',
    buyer: { kind: 'Individual', name: 'Ayşe Yılmaz', identityMasked: '100******46', isUnknownBuyer: false, taxOffice: null },
    missingBuyerFields: [],
    connection: { status: 'Connected', environment: 'Test', providerName: 'Paraşüt' },
    groups: [
        { documentType: 'ESmm', chargeIds: ['c1'], totalAmount: 1200, lineCount: 1 },
        { documentType: 'EArchive', chargeIds: ['c2'], totalAmount: 300, lineCount: 1 }
    ],
    skipped: [],
    taxpayerType: 'Both',
    taxpayerIdentityMasked: '100******46',
    clinicSetupIssues: []
};

/** Mükellef türü seçilmemiş klinik: gruplar boş, hazırlık listesi. */
const missingTaxpayer: EDocumentPreviewDto = { ...preview, groups: [], taxpayerType: null, clinicSetupIssues: [{ code: 'TaxpayerTypeMissing' }] };

const issued = { id: 'd1', status: 'Issued', documentType: 'ESmm', documentNumber: 'SMM-1', canDownloadPdf: true, lastError: null } as unknown as EDocumentDto;

describe('EDocumentIssueDialogComponent', () => {
    let service: MockedObject<EDocumentsService>;

    const render = (p: EDocumentPreviewDto = preview, source: object = { chargeIds: ['c1', 'c2'] }, canUpdateClinic = true) => {
        service = {
            preview: vi.fn().mockReturnValue(of(p)),
            issue: vi.fn().mockReturnValue(of(issued)),
            refresh: vi.fn(),
            pdf: vi.fn()
        } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [EDocumentIssueDialogComponent],
            providers: [provideRouter([]), { provide: EDocumentsService, useValue: service }, { provide: AuthService, useValue: { getClinicId: () => 'k1', hasOperationClaim: () => canUpdateClinic } }]
        });
        const fixture = TestBed.createComponent(EDocumentIssueDialogComponent);

        fixture.componentRef.setInput('source', source);
        fixture.componentInstance.load();
        fixture.detectChanges();

        return fixture;
    };

    it('önizlemeyi gruplar; her grup ayrı ve sabit requestId ile kesilir', () => {
        const fixture = render();
        const cmp = fixture.componentInstance;

        expect(service.preview).toHaveBeenCalledWith({ chargeIds: ['c1', 'c2'] });
        expect(cmp.groups().map((g) => g.group.documentType)).toEqual(['ESmm', 'EArchive']);
        const first = cmp.groups()[0];

        cmp.issue(first);

        expect(service.issue).toHaveBeenCalledWith({ chargeIds: ['c1'] }, first.requestId, '');
        expect(cmp.groups()[0].document?.status).toBe('Issued');
        expect(cmp.groups()[1].document).toBeNull();
    });

    it('satış kaynağında satış kimliğiyle keser', () => {
        const fixture = render({ ...preview, groups: [preview.groups[1]] }, { saleId: 's1' });
        const cmp = fixture.componentInstance;

        cmp.issue(cmp.groups()[0]);

        expect(service.issue).toHaveBeenCalledWith({ saleId: 's1' }, cmp.groups()[0].requestId, '');
    });

    it('klinik ayarı eksikse veya alıcı eksikse kesmeye izin vermez', () => {
        const notConnected = render({ ...preview, clinicSetupIssues: [{ code: 'NotConnected' }], connection: { status: 'NotConnected', environment: null, providerName: null } }).componentInstance;

        expect(notConnected.canIssue(notConnected.preview()!)).toBe(false);
        TestBed.resetTestingModule();

        const noBuyer = render({ ...preview, buyer: null, missingBuyerFields: ['taxNumber'] }).componentInstance;

        expect(noBuyer.canIssue(noBuyer.preview()!)).toBe(false);
    });

    it('eksik ayar hata değil hazırlık listesidir: eksik numaralı, tamam olan değeriyle, birincil düğme ilk eksiğin', () => {
        const fixture = render(missingTaxpayer);
        const cmp = fixture.componentInstance;

        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
        const body = (fixture.nativeElement as HTMLElement).ownerDocument.body;
        const text = body.textContent ?? '';

        expect(cmp.loadError()).toBeNull();
        expect(cmp.setupItems().map((i) => [i.code, i.missingIndex, i.doneValue])).toEqual([
            ['TaxpayerTypeMissing', 0, ''],
            ['TaxpayerIdentityMissing', null, 'TCKN 100******46'],
            ['NotConnected', null, 'Bağlı · Paraşüt · test ortamı']
        ]);
        expect(cmp.setupReadyCount()).toBe(2);
        expect(text).toContain('Belge kesmeden önce bir ayar gerekli');
        expect(text).toContain('2 / 3 hazır');
        expect(body.querySelector('[data-testid="e-document-setup-primary"]')?.textContent).toContain('Mükellef bilgilerini aç');
        expect(body.querySelector('[data-testid="e-document-setup"] .text-danger')).toBeNull();
        expect(text.toLocaleLowerCase('tr-TR')).not.toContain('hata');
        expect(body.querySelector('[data-testid="e-document-issue"]')).toBeNull();
    });

    it('mükellef türü ve VKN / TCKN eksikse sırayla numaralanır, ikisi de mükellef bilgilerine götürür', () => {
        const cmp = render({ ...missingTaxpayer, taxpayerIdentityMasked: null, clinicSetupIssues: [{ code: 'TaxpayerTypeMissing' }, { code: 'TaxpayerIdentityMissing' }] }).componentInstance;

        expect(cmp.setupItems().map((i) => [i.code, i.missingIndex])).toEqual([
            ['TaxpayerTypeMissing', 0],
            ['TaxpayerIdentityMissing', 1],
            ['NotConnected', null]
        ]);
        expect(cmp.setupReadyCount()).toBe(1);
        expect(E_DOCUMENT_SETUP_ISSUE.TaxpayerIdentityMissing.action).toBe('Mükellef bilgilerini aç');
        expect(E_DOCUMENT_SETUP_ISSUE.TaxpayerIdentityMissing.fragment).toBe('mukellef-bilgileri');
    });

    it('ayar düğmesi seçimi saklar ve dönüş adresiyle ayar sayfasına gider', () => {
        const cmp = render(missingTaxpayer).componentInstance;
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        vi.spyOn(router, 'url', 'get').mockReturnValue('/panel/charges?clientId=x&resumeEDocument=1');

        clearEDocumentResume();
        cmp.visible.set(true);
        cmp.openSetup('TaxpayerTypeMissing');

        expect(cmp.visible()).toBe(false);
        expect(navigate).toHaveBeenCalledWith(['/panel/settings/clinics', 'k1'], { fragment: 'mukellef-bilgileri', queryParams: { returnTo: '/panel/charges?clientId=x' } });
        expect(readEDocumentResume()?.source).toEqual({ chargeIds: ['c1', 'c2'] });

        cmp.openSetup('NotConnected');

        expect(navigate).toHaveBeenLastCalledWith(['/panel/settings/e-documents'], { fragment: 'entegrator', queryParams: { returnTo: '/panel/charges?clientId=x' } });
        clearEDocumentResume();
    });

    it('klinik ayarını düzenleme yetkisi yoksa düğme yerine kilitli not gösterir', () => {
        const fixture = render({ ...missingTaxpayer, clinicSetupIssues: [{ code: 'TaxpayerTypeMissing' }, { code: 'TaxpayerIdentityMissing' }, { code: 'NotConnected' }] }, { chargeIds: ['c1'] }, false);

        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
        const body = (fixture.nativeElement as HTMLElement).ownerDocument.body;

        expect(fixture.componentInstance.canFixSetup).toBe(false);
        expect(body.querySelector('[data-testid="e-document-setup-primary"]')).toBeNull();
        expect(body.querySelector('[data-testid="e-document-setup"] button')).toBeNull();
        expect(body.querySelector('[data-testid="e-document-setup-locked"]')?.textContent).toContain('“Mükellef türü, Kliniğin VKN / TCKN numarası, e-Belge entegratörü bağlantısı”');
        expect(body.textContent).toContain('0 / 3 hazır');
    });

    it('gerçek sunucu hatası loadError olarak kalır', () => {
        const fixture = render();

        service.preview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        fixture.componentInstance.load();

        expect(fixture.componentInstance.loadError()).toBeTruthy();
        expect(fixture.componentInstance.setupIssues()).toEqual([]);
    });

    it('pencere başlığı "e-Belge kes" yazar', () => {
        expect(render().componentInstance.header()).toBe('e-Belge kes');
    });

    it('eksik alıcı alanı hatası eyleme dönük metne çevrilir', () => {
        const error = new HttpErrorResponse({ status: 400, error: { code: 'EDocuments.BuyerIdentityMissing', missingFields: ['taxNumber'] } });

        expect(issueErrorMessage(error)).toContain('vergi numarası');
    });

    it('bireysel alıcının ad + soyadı eksikse bunu söyler (diyalog ve kesme hatası)', () => {
        const cmp = render({ ...preview, buyer: null, missingBuyerFields: ['fullName'] }).componentInstance;
        const error = new HttpErrorResponse({ status: 400, error: { code: 'EDocuments.BuyerIdentityMissing', missingFields: ['fullName'] } });

        expect(cmp.canIssue(cmp.preview()!)).toBe(false);
        expect(cmp.missingBuyerText(cmp.preview()!.missingBuyerFields)).toContain('adı ve soyadı');
        expect(cmp.missingBuyerText(['taxNumber'])).toContain('vergi numarası');
        expect(issueErrorMessage(error)).toContain('adı ve soyadı');
    });

    it('kesme hatası grupta gösterilir, diğer grup etkilenmez', () => {
        const fixture = render();
        const cmp = fixture.componentInstance;

        service.issue.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Seçilen ücretlerden biri başka bir geçerli belgeye bağlı.' } })));
        cmp.issue(cmp.groups()[0]);

        expect(cmp.groups()[0].error).toBeTruthy();
        expect(cmp.groups()[0].busy).toBe(false);
        expect(cmp.groups()[1].error).toBeNull();
    });
});

describe('e-document-labels', () => {
    it('tür ve durum etiketleri Türkçe', () => {
        expect(eDocumentTypeLabel('ESmm')).toBe('e-SMM');
        expect(eDocumentTypeLabel('EInvoice')).toBe('e-Fatura');
        expect(eDocumentStatusLabel('CancelRejected')).toBe('İptal reddedildi');
        expect(isEDocumentPending('Sending')).toBe(true);
        expect(isEDocumentPending('Issued')).toBe(false);
    });

    it('tamam olan ayarın değeri ve dönüş düğmesi', () => {
        expect(eDocumentSetupDoneValue('TaxpayerTypeMissing', { ...preview, taxpayerType: 'SelfEmployed' })).toBe('Serbest meslek');
        expect(eDocumentSetupDoneValue('TaxpayerIdentityMissing', { ...preview, taxpayerIdentityMasked: '123*****90' })).toBe('VKN 123*****90');
        expect(eDocumentSetupDoneValue('NotConnected', { ...preview, connection: { status: 'Connected', environment: 'Live', providerName: null } })).toBe('Bağlı · canlı ortam');
        expect(eDocumentReturnLabel('/panel/charges?clientId=x')).toBe('Ücretlere dön');
        expect(eDocumentReturnLabel('/panel/e-documents')).toBe('e-Belgelere dön');
        expect(eDocumentReturnLabel('/panel/sales/s1')).toBe('Satışa dön');
        expect(eDocumentReturnLabel('/panel/today')).toBe('Bugün’e dön');
        expect(eDocumentReturnLabel('/panel/chargesx')).toBe('Geri dön');
    });
});
