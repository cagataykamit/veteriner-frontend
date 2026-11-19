import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { HospitalizationDetailVm } from '@/app/entities/hospitalization/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/entities/hospitalization/services/hospitalizations.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { HospitalizationDetailPageComponent } from './hospitalization-detail-page.component';

describe('HospitalizationDetailPageComponent — rota kimliği değişimi', () => {
    it('aynı bileşende başka yatışa geçince yeni kaydı yükler; eski kaydın mesajları ve taburcu diyaloğu kalmaz, taburcu yeni kayda gider', () => {
        const paramMap = new BehaviorSubject(convertToParamMap({ id: 'h1' }));
        const route = { paramMap, snapshot: { queryParamMap: convertToParamMap({ saved: 'created' }) } };
        const service = {
            getHospitalizationById: vi.fn((id: string) => of({ id, rowVersion: `V-${id}` } as HospitalizationDetailVm)),
            dischargeHospitalization: vi.fn(() => of(void 0))
        };

        TestBed.configureTestingModule({
            imports: [HospitalizationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: HospitalizationsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: VisitsService, useValue: { getVisitById: vi.fn(() => of({ id: 'v1', careStatus: 'Completed', isVoided: false })), completeVisit: vi.fn(() => of({})) } }
            ]
        });
        TestBed.overrideTemplate(HospitalizationDetailPageComponent, '');
        const fixture = TestBed.createComponent(HospitalizationDetailPageComponent);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        expect(page.savedMessage()).toBe('Kayıt oluşturuldu.');
        page.showDischargedBanner.set(true);
        page.openDischargeDialog();

        route.snapshot = { queryParamMap: convertToParamMap({}) };
        paramMap.next(convertToParamMap({ id: 'h2' }));

        expect(service.getHospitalizationById).toHaveBeenLastCalledWith('h2');
        expect(page.row()?.id).toBe('h2');
        expect(page.savedMessage()).toBeNull();
        expect(page.showDischargedBanner()).toBe(false);
        expect(page.dischargeDialogVisible()).toBe(false);

        page.dischargeForm.setValue({ dischargedAtLocal: '2026-10-20T10:00', dischargeNote: '' });
        page.onDischargeSubmit();

        expect(service.dischargeHospitalization).toHaveBeenCalledWith('h2', expect.objectContaining({ rowVersion: 'V-h2' }));
    });
});

describe('HospitalizationDetailPageComponent — gerekçeli iptal (ADR-043 AK-5)', () => {
    it('iptal ekranın açıldığı sürümle ve gerekçeyle gönderilir', () => {
        const service = {
            getHospitalizationById: vi.fn((id: string) => of({ id, reason: 'Gözlem', petName: 'Pamuk', rowVersion: 'V1', isCancelled: false } as HospitalizationDetailVm)),
            cancelHospitalization: vi.fn(() => of({ id: 'h1', rowVersion: 'V2' }))
        };

        TestBed.configureTestingModule({
            imports: [HospitalizationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'h1' })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: HospitalizationsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: VisitsService, useValue: { getVisitById: vi.fn(() => of({ id: 'v1', careStatus: 'Completed', isVoided: false })), completeVisit: vi.fn(() => of({})) } }
            ]
        });
        TestBed.overrideTemplate(HospitalizationDetailPageComponent, '');
        const fixture = TestBed.createComponent(HospitalizationDetailPageComponent);
        const page = fixture.componentInstance as unknown as {
            cancelSummary: () => string | null;
            cancelHospitalization: (reason: string) => unknown;
        };

        fixture.detectChanges();
        expect(page.cancelSummary()).toBe('Gözlem · Pamuk');

        page.cancelHospitalization('Yanlış hastaya açıldı');

        expect(service.cancelHospitalization).toHaveBeenCalledWith('h1', 'Yanlış hastaya açıldı', 'V1');
    });
});

describe('HospitalizationDetailPageComponent — taburcuda gelişi tamamla önerisi', () => {
    function setup(careStatus: string) {
        const route = { paramMap: new BehaviorSubject(convertToParamMap({ id: 'h1' })), snapshot: { queryParamMap: convertToParamMap({}) } };
        const service = {
            getHospitalizationById: vi.fn(() => of({ id: 'h1', visitId: 'v1', rowVersion: 'V1' } as HospitalizationDetailVm)),
            dischargeHospitalization: vi.fn(() => of(void 0))
        };
        const visits = { getVisitById: vi.fn(() => of({ id: 'v1', careStatus, isVoided: false })), completeVisit: vi.fn(() => of({})) };

        TestBed.configureTestingModule({
            imports: [HospitalizationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: HospitalizationsService, useValue: service },
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(HospitalizationDetailPageComponent, '');
        const fixture = TestBed.createComponent(HospitalizationDetailPageComponent);

        fixture.detectChanges();
        const page = fixture.componentInstance;

        page.dischargeForm.setValue({ dischargedAtLocal: '2026-10-20T10:00', dischargeNote: '' });
        page.onDischargeSubmit();

        return { page, visits };
    }

    it('bağlı geliş muayenedeyse taburcudan sonra önerilir; tamamlanınca öneri kalkar', () => {
        const { page, visits } = setup('InProgress');

        expect(page.dischargeVisitId()).toBe('v1');
        page.completeDischargedVisit('v1');
        expect(visits.completeVisit).toHaveBeenCalledWith('v1');
        expect(page.dischargeVisitId()).toBeNull();
        expect(page.visitCompleted()).toBe(true);
    });

    it('geliş zaten tamamlanmışsa öneri yok', () => {
        const { page } = setup('Completed');

        expect(page.dischargeVisitId()).toBeNull();
    });
});
