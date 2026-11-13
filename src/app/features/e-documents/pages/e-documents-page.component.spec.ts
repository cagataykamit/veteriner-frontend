import type { MockedObject } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { EDocumentListItemDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { EDocumentsPageComponent } from './e-documents-page.component';

const row = (over: Partial<EDocumentListItemDto>): EDocumentListItemDto => ({
    id: 'd1',
    clinicId: 'k1',
    clientId: 'c1',
    clientName: 'Örnek Ltd.',
    documentType: 'EInvoice',
    status: 'Issued',
    documentNumber: 'ANS2026000000011',
    totalAmount: 600,
    createdAtUtc: '2026-11-13T15:09:00Z',
    issuedAtUtc: '2026-11-13T15:10:00Z',
    isTest: true,
    lastErrorMessage: null,
    origin: 'Manual',
    canCancel: false,
    buyerAnswerDueUtc: null,
    buyerRejectionReason: null,
    ...over
});

describe('EDocumentsPageComponent', () => {
    let service: MockedObject<EDocumentsService>;

    const render = (items: EDocumentListItemDto[]) => {
        service = {
            list: vi.fn().mockReturnValue(of({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 })),
            undocumentedCharges: vi.fn()
        } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [EDocumentsPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://test' },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: EDocumentsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'k1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(EDocumentsPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    const buttons = (host: HTMLElement, text: string) => Array.from(host.querySelectorAll('button')).filter((b) => b.textContent?.includes(text));

    it('iptal düğmesi sunucunun iptal edilebilirlik bilgisine uyar; iptal edilemeyen e-Faturada düzeltme yolu gösterilir', () => {
        const fixture = render([row({ id: 'efatura', canCancel: false }), row({ id: 'earsiv', documentType: 'EArchive', documentNumber: 'GIB1', canCancel: true })]);
        const host = fixture.nativeElement as HTMLElement;

        expect(buttons(host, 'İptal et')).toHaveLength(1);
        const toggle = host.querySelector('[data-testid="edoc-einvoice-guide-toggle"]') as HTMLButtonElement;

        expect(toggle).not.toBeNull();
        toggle.click();
        fixture.detectChanges();

        const guide = host.querySelector('[data-testid="edoc-einvoice-guide"]')?.textContent ?? '';

        expect(guide).toContain('8 gün içinde');
        expect(guide).toContain('KEP, noter veya GİB');
        expect(guide).toContain('iade faturası');
        expect(guide.trim().endsWith('mali müşavirinize danışın.')).toBe(true);
    });

    it('alıcı yanıtı bekleyen ve alıcının reddettiği e-Faturayı ayırt eder', () => {
        const fixture = render([row({ id: 'bekleyen', buyerAnswerDueUtc: '2026-11-21T15:10:00Z' }), row({ id: 'red', status: 'RejectedByBuyer', buyerRejectionReason: 'Fiyat hatalı.' })]);
        const host = fixture.nativeElement as HTMLElement;
        const text = host.textContent ?? '';

        expect(host.querySelector('[data-testid="edoc-awaiting-answer"]')?.textContent).toContain('Alıcı yanıtı bekleniyor');
        expect(text).toContain('Alıcı reddetti');
        expect(text).toContain('Fiyat hatalı.');
        expect(text).toContain('Ücretler yeniden belgelenebilir');
    });
});
