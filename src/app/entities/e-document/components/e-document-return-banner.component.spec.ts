import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { EDocumentPreviewDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { clearEDocumentResume, storeEDocumentResume } from '@/app/entities/e-document/utils/e-document-resume';
import { EDocumentReturnBannerComponent } from './e-document-return-banner.component';

const previewWith = (issues: EDocumentPreviewDto['clinicSetupIssues']) => of({ clinicSetupIssues: issues } as unknown as EDocumentPreviewDto);

describe('EDocumentReturnBannerComponent', () => {
    let service: MockedObject<EDocumentsService>;

    const render = (query: Record<string, string>, issues: EDocumentPreviewDto['clinicSetupIssues'] = []) => {
        service = { preview: vi.fn().mockReturnValue(previewWith(issues)) } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [EDocumentReturnBannerComponent],
            providers: [provideRouter([]), { provide: EDocumentsService, useValue: service }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }]
        });
        const fixture = TestBed.createComponent(EDocumentReturnBannerComponent);

        fixture.detectChanges();

        return fixture;
    };

    afterEach(() => clearEDocumentResume());

    it('"Belge kes"ten gelinmediyse görünmez', () => {
        const fixture = render({});

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="e-document-return-banner"]')).toBeNull();
        expect(service.preview).not.toHaveBeenCalled();
    });

    it('eksik kaldıkça yalnız dönüş; eksik kalmayınca "Ücretlere dön ve belgeyi kes"', () => {
        storeEDocumentResume({ chargeIds: ['c1'] }, '/panel/charges');
        const fixture = render({ returnTo: '/panel/charges' }, [{ code: 'TaxpayerTypeMissing' }]);
        const button = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="e-document-return"]')?.textContent?.trim();

        expect(button()).toBe('Ücretlere dön');

        service.preview.mockReturnValue(previewWith([]));
        fixture.componentInstance.recheck();
        fixture.detectChanges();

        expect(service.preview).toHaveBeenLastCalledWith({ chargeIds: ['c1'] });
        expect(button()).toBe('Ücretlere dön ve belgeyi kes');
    });

    it('dönüş işaretiyle çağıran sayfaya gider; entegratör onayından dönüşte adres saklanandan gelir', () => {
        storeEDocumentResume({ chargeIds: ['c1'] }, '/panel/charges?clientId=x');
        const fixture = render({ eDocumentConnection: 'connected', clinicId: 'k1' });
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

        expect(fixture.componentInstance.returnTo()).toBe('/panel/charges?clientId=x');
        fixture.componentInstance.back('/panel/charges?clientId=x');

        expect(navigate).toHaveBeenCalledWith('/panel/charges?clientId=x&resumeEDocument=1');
    });

    it('dış adrese dönmez', () => {
        const fixture = render({ returnTo: 'https://example.com' });

        expect(fixture.componentInstance.returnTo()).toBeNull();
    });
});
