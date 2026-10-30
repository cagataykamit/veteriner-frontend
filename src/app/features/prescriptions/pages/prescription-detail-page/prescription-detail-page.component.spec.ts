import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { PrescriptionDetailVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
import { HbsService } from '@/app/entities/hbs/services/hbs.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { RecordHistoryService } from '@/app/entities/record-history/services/record-history.service';
import { PrescriptionDetailPageComponent } from './prescription-detail-page.component';

describe('PrescriptionDetailPageComponent — rota kimliği değişimi', () => {
    it('aynı bileşende başka reçeteye geçince yeni kaydı yükler; eski kaydın onay mesajı kalmaz', () => {
        const paramMap = new BehaviorSubject(convertToParamMap({ id: 'rx1' }));
        const route = { paramMap, snapshot: { queryParamMap: convertToParamMap({ saved: '1' }) } };
        const getPrescriptionById = vi.fn((id: string) => of({ id } as PrescriptionDetailVm));

        TestBed.configureTestingModule({
            imports: [PrescriptionDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: PrescriptionsService, useValue: { getPrescriptionById } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(PrescriptionDetailPageComponent, '');
        const fixture = TestBed.createComponent(PrescriptionDetailPageComponent);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        expect(page.showSavedBanner()).toBe(true);

        route.snapshot = { queryParamMap: convertToParamMap({}) };
        paramMap.next(convertToParamMap({ id: 'rx2' }));

        expect(getPrescriptionById).toHaveBeenLastCalledWith('rx2');
        expect(page.row()?.id).toBe('rx2');
        expect(page.showSavedBanner()).toBe(false);
    });
});

/** RECORD-008: gerekçeli iptal, iptal bilgisi ve sonradan ekleme rozeti. */
describe('PrescriptionDetailPageComponent — iptal', () => {
    const base: PrescriptionDetailVm = {
        id: 'rx1', clinicId: 'c1', petId: 'p1', petName: 'Pamuk', clientId: 'cl1', clientName: 'Ali Veli', examinationId: null, treatmentId: null,
        prescribedAtUtc: '2026-10-30T07:00:00Z', title: 'Antibiyotik', content: 'İçerik', notes: '—', followUpDateUtc: null, createdAtUtc: null,
        updatedAtUtc: null, items: [], hbs: null, isCancelled: false, cancelledAtUtc: null, cancelledByName: null, cancelReason: null,
        addedAfterFinalization: false, lateEntryReason: null
    };

    const render = (vm: PrescriptionDetailVm, cancelPrescription = vi.fn(() => of(undefined))) => {
        TestBed.configureTestingModule({
            imports: [PrescriptionDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: vm.id })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: PrescriptionsService, useValue: { getPrescriptionById: () => of(vm), cancelPrescription } },
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: HbsService, useValue: { getHbsData: () => of(null), updateHbsEntry: () => of(null) } },
                { provide: RecordHistoryService, useValue: { getHistory: () => of([]) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(PrescriptionDetailPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll('[actions] a, [actions] button')).map((b) => b.textContent?.trim());

    it('etkin reçetede Düzenle ve İptal et görünür; iptal servis çağrısı gerekçeyle yapılır', () => {
        const cancelPrescription = vi.fn(() => of(undefined));
        const fixture = render(base, cancelPrescription);

        expect(buttons(fixture.nativeElement)).toEqual(expect.arrayContaining(['Düzenle', 'İptal et']));
        fixture.componentInstance.cancelPrescription('Yanlış hastaya yazıldı').subscribe();
        expect(cancelPrescription).toHaveBeenCalledWith('rx1', 'Yanlış hastaya yazıldı');
    });

    it('iptal edilmiş reçetede düzenleme/iptal yok; iptal gerekçesi görünür', () => {
        const fixture = render({ ...base, isCancelled: true, cancelledAtUtc: '2026-10-30T08:00:00Z', cancelledByName: 'Dr. Ayşe', cancelReason: 'Yanlış hastaya yazıldı' });
        const el = fixture.nativeElement as HTMLElement;

        expect(buttons(el)).not.toContain('Düzenle');
        expect(buttons(el)).not.toContain('İptal et');
        expect(el.querySelector('[data-testid="prescription-cancelled"]')?.textContent).toContain('İptal');
        expect(el.textContent).toContain('Yanlış hastaya yazıldı');
        expect(el.textContent).toContain('Dr. Ayşe');
    });

    it('sonradan eklenen reçetede rozet ve gerekçe görünür', () => {
        const el = render({ ...base, addedAfterFinalization: true, lateEntryReason: 'Kesinleştirmeden sonra yazıldı' }).nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="prescription-late-entry"]')?.textContent).toContain('Kesinleştirmeden sonra eklendi');
        expect(el.textContent).toContain('Kesinleştirmeden sonra yazıldı');
    });
});
