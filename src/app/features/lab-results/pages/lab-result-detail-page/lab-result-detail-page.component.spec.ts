import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AuthService } from '@/app/core/auth/auth.service';
import type { LabResultDetailVm, LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { LabResultDetailPageComponent } from './lab-result-detail-page.component';

const vm = (status: LabResultStatus): LabResultDetailVm => ({
    id: 'l1',
    clinicId: 'clinic-1',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    examinationId: null,
    resultDateUtc: null,
    requestedAtUtc: '2026-10-08T10:30:00Z',
    status,
    awaitingInterpretation: false,
    testName: 'Kan sayımı',
    resultText: null,
    interpretation: '—',
    notes: '—',
    createdAtUtc: null,
    updatedAtUtc: null,
    cancelledAtUtc: null,
    cancelReason: null,
    rowVersion: 'V1'
});

describe('LabResultDetailPageComponent — başlık eylemleri', () => {
    const render = (status: LabResultStatus, canUpdate = true, blocked = false): string[] => {
        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: StoredFilesService, useValue: { list: () => of([]) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResultById: () => of(vm(status)) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => canUpdate } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);

        fixture.detectChanges();
        const actions = (fixture.nativeElement as HTMLElement).querySelectorAll('[actions]');

        return Array.from(actions).flatMap((c) => Array.from(c.querySelectorAll('a, button')).map((e) => e.textContent?.trim() ?? ''));
    };

    it('Requested: "Sonuç gir" ve "İptal et" görünür', () => {
        expect(render('Requested')).toEqual(['Sonuç gir', 'İptal et']);
    });

    it('Resulted: "Düzenle" ve "İptal et" görünür (muayene durumundan bağımsız)', () => {
        expect(render('Resulted')).toEqual(['Düzenle', 'İptal et']);
    });

    it('Cancelled: eylem yok', () => {
        expect(render('Cancelled')).toEqual([]);
    });

    it('izin yoksa eylem yok', () => {
        expect(render('Requested', false)).toEqual([]);
    });

    it('salt okunur kiracıda yalnız kilitli düğme', () => {
        expect(render('Requested', true, true)).toEqual(['Düzenle (salt okunur)']);
    });
});

describe('LabResultDetailPageComponent — İptal et', () => {
    it('liste satırıyla ortak iptal diyaloğunu açar; onayda ekranın açıldığı sürümle iptal eder ve kaydı yeniler', () => {
        const service = {
            getLabResultById: jasmine.createSpy('getLabResultById').and.returnValue(of(vm('Requested'))),
            cancelLabResult: jasmine.createSpy('cancelLabResult').and.returnValue(of(void 0))
        };

        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: StoredFilesService, useValue: { list: () => of([]) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);

        fixture.detectChanges();
        const cancelButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[actions] button')).find((b) => b.textContent?.trim() === 'İptal et') as HTMLElement;

        cancelButton.click();
        fixture.detectChanges();

        expect(fixture.debugElement.query((d) => d.name === 'app-lab-result-cancel-dialog')).not.toBeNull();
        const dialog = fixture.debugElement.query((d) => d.name === 'app-reason-confirm-dialog').componentInstance as ReasonConfirmDialogComponent;

        expect(dialog.visible()).toBeTrue();
        expect(service.cancelLabResult).not.toHaveBeenCalled();

        service.getLabResultById.calls.reset();
        dialog.form.controls.reason.setValue('Yanlış hastaya istendi');
        dialog.onSubmit();

        expect(service.cancelLabResult).toHaveBeenCalledOnceWith('l1', 'Yanlış hastaya istendi', 'V1');
        expect(service.getLabResultById).withContext('yalnız yenileme; sürüm zaten ekrandan gelir').toHaveBeenCalledTimes(1);
    });
});

describe('LabResultDetailPageComponent — dosyalar', () => {
    const render = (status: LabResultStatus, canUpdate: boolean) => {
        const list = jasmine.createSpy('list').and.returnValue(
            of([{ id: 'f1', fileName: 'sonuc.pdf', contentType: 'application/pdf', kind: 'Pdf', sizeBytes: 10, uploadedAtUtc: '' }])
        );

        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: StoredFilesService, useValue: { list } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResultById: () => of(vm(status)) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => canUpdate } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);

        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, list };
    };

    it('dosyalar ayrı uçtan listelenir; güncelleme yetkisiyle yükleme alanı görünür', () => {
        const { el, list } = render('Resulted', true);

        expect(list).toHaveBeenCalledWith('/api/v1/lab-results/l1');
        expect(el.querySelector('[data-testid="file-pdf"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="file-dropzone"]')).not.toBeNull();
    });

    it('yetki yoksa veya kayıt iptalse yükleme alanı yok', () => {
        expect(render('Resulted', false).el.querySelector('[data-testid="file-dropzone"]')).toBeNull();
        TestBed.resetTestingModule();
        expect(render('Cancelled', true).el.querySelector('[data-testid="file-dropzone"]')).toBeNull();
    });
});

describe('LabResultDetailPageComponent — kayıt sonrası onay', () => {
    const bannerFor = (saved: string | null): string | null => {
        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: StoredFilesService, useValue: { list: () => of([]) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap(saved ? { saved } : {}) } } },
                { provide: LabResultsService, useValue: { getLabResultById: () => of(vm('Requested')) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);

        fixture.detectChanges();

        return (fixture.nativeElement as HTMLElement).querySelector('p.text-sm.font-medium')?.textContent?.trim() ?? null;
    };

    it('oluşturma sonrası "Kayıt oluşturuldu.", düzenleme sonrası "Kayıt güncellendi."', () => {
        expect(bannerFor('created')).toBe('Kayıt oluşturuldu.');
        TestBed.resetTestingModule();
        expect(bannerFor('1')).toBe('Kayıt güncellendi.');
        TestBed.resetTestingModule();
        expect(bannerFor(null)).toBeNull();
    });
});
