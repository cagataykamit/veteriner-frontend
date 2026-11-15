import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { defaultStoredConfig } from '@site-engine';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import type { ClinicSiteDetailDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { ClinicSiteService } from '@/app/features/clinic-site/services/clinic-site.service';
import { ContentStepComponent } from './content-step.component';

const DETAIL: ClinicSiteDetailDto = {
    exists: true,
    suggestedSlug: null,
    site: {
        siteId: 's1',
        clinicId: 'c1',
        slug: 'cagri-vet',
        publicPath: '/k/cagri-vet',
        isTemporarilyClosed: false,
        publishedVersionNumber: null,
        publishedAtUtc: null,
        hasUnpublishedChanges: false,
        draftUpdatedAtUtc: '2026-11-07T10:00:00Z',
        rowVersion: 'r1'
    },
    draft: defaultStoredConfig(),
    isClosedBySubscription: false,
    missingForPublish: [],
    missingImageIds: [],
    images: [{ id: 'g1', reference: 'site-image:g1', contentType: 'image/png', sizeBytes: 2048, createdAtUtc: '2026-11-07T10:00:00Z' }]
};

describe('ContentStepComponent — görsel silme onayı (H12)', () => {
    it('Sil önce satırda onay sorar; Vazgeç vazgeçer, Görseli sil sunucudan siler', async () => {
        const deleteImage = vi.fn(() => of(null));

        TestBed.configureTestingModule({
            imports: [ContentStepComponent],
            providers: [
                SiteBuilderStore,
                { provide: ClinicSiteService, useValue: { get: () => of(DETAIL), versions: () => of([]), imageContent: () => of(new Blob(['x'])), deleteImage } },
                {
                    provide: ClinicsService,
                    useValue: { listClinics: () => of([]), getClinicById: () => of({ id: 'c1', name: 'Çağrı', isActive: true, phone: '03120000000' }), getWorkingHours: () => of([]) }
                },
                { provide: OnlineBookingService, useValue: { getSettings: () => of({ isEnabled: false, bookingUrl: null }) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'c1', getClinicName: () => 'Çağrı' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(false) } }
            ]
        });
        const store = TestBed.inject(SiteBuilderStore);

        store.clinicId.set('c1');
        store.reload();
        const fixture = TestBed.createComponent(ContentStepComponent);
        const el = fixture.nativeElement as HTMLElement;
        const byTestId = (id: string) => el.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);

        fixture.detectChanges();
        byTestId('image-delete')!.click();
        fixture.detectChanges();
        expect(el.textContent).toContain('Görsel silinsin mi?');
        expect(deleteImage).not.toHaveBeenCalled();

        Array.from(el.querySelectorAll('button'))
            .find((b) => b.textContent?.trim() === 'Vazgeç')!
            .click();
        fixture.detectChanges();
        expect(byTestId('image-delete-confirm')).toBeNull();

        byTestId('image-delete')!.click();
        fixture.detectChanges();
        byTestId('image-delete-confirm')!.click();
        await fixture.whenStable();
        expect(deleteImage).toHaveBeenCalledWith('c1', 'g1');
    });
});
