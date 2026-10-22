import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CANCEL_CLAIM, IMAGING_CREATE_CLAIM, IMAGING_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ImagingRecordDetailVm, ImagingRecordStatus } from '@/app/features/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { ImagingDetailPageComponent } from './imaging-detail-page.component';

const vm = (status: ImagingRecordStatus): ImagingRecordDetailVm => ({
    id: 'r1',
    clinicId: 'clinic-1',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    examinationId: 'exam-1',
    performedAtUtc: '2026-10-22T07:30:00Z',
    modality: 'XRay',
    description: 'Toraks LL',
    clinicalNote: null,
    status,
    addedAfterExaminationFinalization: true,
    createdAtUtc: '2026-10-22T07:35:00Z',
    createdByUserId: 'u1',
    updatedAtUtc: null,
    cancelledAtUtc: null,
    cancelledByUserId: null,
    cancelReason: null,
    rowVersion: 'V1',
    files: status === 'Active' ? [{ id: 'f1', fileName: 'a.jpg', contentType: 'image/jpeg', kind: 'Image', sizeBytes: 10, uploadedAtUtc: '' }] : []
});

describe('ImagingDetailPageComponent — izin görünürlüğü ve önizleme', () => {
    const render = (claims: string[], status: ImagingRecordStatus = 'Active', blocked = false) => {
        TestBed.configureTestingModule({
            imports: [ImagingDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'r1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: ImagingRecordsService, useValue: { getById: () => of(vm(status)), filesOwner: (id: string) => `/api/v1/imaging-records/${id}` } },
                { provide: StoredFilesService, useValue: { accessUrl: () => of('https://api/signed/f1') } },
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        });
        const fixture = TestBed.createComponent(ImagingDetailPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('Veteriner: iptal ve dosya ekleme görünür; görüntünün alt metni tür + tarih', () => {
        const el = render([IMAGING_READ_CLAIM, IMAGING_CREATE_CLAIM, IMAGING_CANCEL_CLAIM]);

        expect(el.querySelector('[data-testid="imaging-cancel"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="file-dropzone"]')).not.toBeNull();
        expect(el.querySelector('img')?.getAttribute('alt')).toMatch(/^Röntgen, \d{2}\.\d{2}\.\d{4}$/);
        expect(el.textContent).toContain('Kesinleştirmeden sonra eklendi');
    });

    it('Sekreter (yalnız okuma): önizleme var, iptal ve yükleme yok', () => {
        const el = render([IMAGING_READ_CLAIM]);

        expect(el.querySelector('[data-testid="file-gallery"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="imaging-cancel"]')).toBeNull();
        expect(el.querySelector('[data-testid="file-dropzone"]')).toBeNull();
    });

    it('iptal edilmiş kayıtta eylem ve yükleme yok, erişimin kapandığı söylenir', () => {
        const el = render([IMAGING_READ_CLAIM, IMAGING_CREATE_CLAIM, IMAGING_CANCEL_CLAIM], 'Cancelled');

        expect(el.querySelector('[data-testid="imaging-cancel"]')).toBeNull();
        expect(el.querySelector('[data-testid="file-dropzone"]')).toBeNull();
        expect(el.textContent).toContain('dosyalara erişim kapalı');
    });

    it('salt okunur kiracıda iptal kilitli, yükleme yok', () => {
        const el = render([IMAGING_READ_CLAIM, IMAGING_CREATE_CLAIM, IMAGING_CANCEL_CLAIM], 'Active', true);

        expect(el.textContent).toContain('İptal et (salt okunur)');
        expect(el.querySelector('[data-testid="file-dropzone"]')).toBeNull();
    });
});
