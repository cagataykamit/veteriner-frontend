import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { EDocumentDto, EDocumentPreviewDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { eDocumentStatusLabel, eDocumentTypeLabel, isEDocumentPending } from '@/app/entities/e-document/utils/e-document-labels';
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
    skipped: []
};

const issued = { id: 'd1', status: 'Issued', documentType: 'ESmm', documentNumber: 'SMM-1', canDownloadPdf: true, lastError: null } as unknown as EDocumentDto;

describe('EDocumentIssueDialogComponent', () => {
    let service: MockedObject<EDocumentsService>;

    const render = (p: EDocumentPreviewDto = preview, source: object = { chargeIds: ['c1', 'c2'] }) => {
        service = {
            preview: vi.fn().mockReturnValue(of(p)),
            issue: vi.fn().mockReturnValue(of(issued)),
            refresh: vi.fn(),
            pdf: vi.fn()
        } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [EDocumentIssueDialogComponent],
            providers: [provideRouter([]), { provide: EDocumentsService, useValue: service }, { provide: AuthService, useValue: { getClinicId: () => 'k1' } }]
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

    it('bağlantı yoksa veya alıcı eksikse kesmeye izin vermez', () => {
        const fixture = render({ ...preview, buyer: null, missingBuyerFields: ['taxNumber'], connection: { status: 'NotConnected', environment: null, providerName: null } });
        const cmp = fixture.componentInstance;
        const text = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

        expect(cmp.canIssue(cmp.preview()!)).toBe(false);
        expect(text).toBeDefined();
    });

    it('eksik alıcı alanı hatası eyleme dönük metne çevrilir', () => {
        const error = new HttpErrorResponse({ status: 400, error: { code: 'EDocuments.BuyerIdentityMissing', missingFields: ['taxNumber'] } });

        expect(issueErrorMessage(error)).toContain('vergi numarası');
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
});
