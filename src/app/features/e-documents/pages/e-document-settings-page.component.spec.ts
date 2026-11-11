import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicEDocumentSettingsDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { EDocumentSettingsPageComponent } from './e-document-settings-page.component';

const settings: ClinicEDocumentSettingsDto = {
    clinicId: 'k1',
    autoIssueMode: 'Off',
    endOfDayTime: '23:00',
    issueOnPaymentByDefault: false,
    autoIssueEnabledAtUtc: null,
    taxpayerType: 'Both',
    serviceDocument: 'ESmm',
    productDocument: 'Invoice'
};

describe('EDocumentSettingsPageComponent', () => {
    let service: MockedObject<EDocumentsService>;

    const render = (query: Record<string, string> = {}) => {
        service = {
            getSettings: vi.fn().mockReturnValue(of(settings)),
            updateSettings: vi.fn().mockImplementation((_id: string, body: object) => of({ ...settings, ...body })),
            getConnection: vi.fn().mockReturnValue(of({ clinicId: 'k1', status: 'NotConnected', availableProviders: [] }))
        } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [EDocumentSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: EDocumentsService, useValue: service },
                { provide: AuthService, useValue: { getClinicId: () => 'aktif' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(EDocumentSettingsPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    it('aktif kliniğin ayarını ve mükellef türünden çıkan belge türlerini gösterir', () => {
        const fixture = render();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(service.getSettings).toHaveBeenCalledWith('aktif');
        expect(text).toContain('e-SMM (serbest meslek makbuzu)');
        expect(text).toContain('alıcı e-Fatura mükellefiyse e-Fatura');
    });

    it('OAuth dönüşündeki klinik kullanılır', () => {
        render({ clinicId: 'k1' });

        expect(service.getSettings).toHaveBeenCalledWith('k1');
    });

    it('değişiklik yokken kaydetmez; otomatik modu ve ödeme varsayılanını kaydeder', () => {
        const fixture = render();
        const cmp = fixture.componentInstance;

        expect(cmp.dirty()).toBe(false);
        cmp.mode = 'OnPayment';
        cmp.issueOnPaymentByDefault = true;
        expect(cmp.dirty()).toBe(true);
        cmp.save();

        expect(service.updateSettings).toHaveBeenCalledWith('aktif', { autoIssueMode: 'OnPayment', endOfDayTime: '23:00', issueOnPaymentByDefault: true });
        expect(cmp.dirty()).toBe(false);
    });
});
