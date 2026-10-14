import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationDetailVm, ExaminationRelatedSummaryVm } from '@/app/features/examinations/models/examination-vm.model';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { ExaminationProceduresSectionComponent } from './examination-procedures-section.component';

const exam = { id: 'e1', clientId: 'client-1', clientName: 'Ali Veli', petId: 'pet-1', petName: 'Pamuk', status: 'Draft' } as ExaminationDetailVm;
const summary = {
    examinationId: 'e1',
    treatments: [{ id: 't1', treatmentDateUtc: '2026-10-08T11:00:00Z', clinicId: null, clinicName: null, title: 'Serum' }],
    prescriptions: [],
    labResults: [],
    hospitalizations: [],
    payments: []
} as unknown as ExaminationRelatedSummaryVm;

describe('ExaminationProceduresSectionComponent', () => {
    let fixture: ComponentFixture<ExaminationProceduresSectionComponent>;
    let cmp: ExaminationProceduresSectionComponent;
    let changed: number;
    let blocked: boolean;

    const create = (vm: ExaminationDetailVm = exam, claims: string[] = ['Treatments.Create', 'Vaccinations.Create']) => {
        TestBed.configureTestingModule({
            imports: [ExaminationProceduresSectionComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicName: () => 'K', getClinicId: () => 'c' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } },
                {
                    provide: VaccinationsService,
                    useValue: { getVaccinationById: () => of({ id: 'v1', vaccineName: 'Kuduz', appliedAtUtc: '2026-10-08T12:00:00Z', dueAtUtc: null }) }
                }
            ]
        });
        fixture = TestBed.createComponent(ExaminationProceduresSectionComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('exam', vm);
        fixture.componentRef.setInput('summary', summary);
        changed = 0;
        cmp.changed.subscribe(() => changed++);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    beforeEach(() => {
        blocked = false;
    });

    it('özet kayıtlarını tek listede tür etiketiyle gösterir', () => {
        const el = create();
        const list = el.querySelector('[data-testid="procedure-list"]');

        expect(list?.textContent).toContain('Tedavi');
        expect(list?.textContent).toContain('Serum');
    });

    it('Ekle yan paneli açar; müşteri, hayvan ve muayene bağlamı forma taşınır', () => {
        create();
        cmp.open('treatment');
        fixture.detectChanges();

        expect(cmp.drawerVisible()).toBeTrue();
        const ctx = cmp.contextParams();
        expect(ctx.get('clientId')).toBe('client-1');
        expect(ctx.get('petId')).toBe('pet-1');
        expect(ctx.get('examinationId')).toBe('e1');
        expect(document.body.querySelector('app-treatment-form')).not.toBeNull();
    });

    it('kayıttan sonra panel kapanır, aynı muayenede kalınır ve liste yenileme istenir', () => {
        create();
        cmp.open('treatment');
        cmp.onSaved('treatment');

        expect(cmp.drawerVisible()).toBeFalse();
        expect(changed).toBe(1);
        expect(cmp.notice()).toBe('Tedavi kaydedildi.');
    });

    it('aşı kaydı stok bildirimiyle gelir ve oturum listesine eklenir', () => {
        create();
        cmp.onVaccinationSaved({ id: 'v1', stockNotice: { text: 'Aşı kaydedildi; kalan stok 8 doz.', warn: false } });

        expect(cmp.notice()).toContain('kalan stok 8 doz');
        expect(cmp.rows().some((r) => r.kind === 'vaccination' && r.title === 'Kuduz')).toBeTrue();
        expect(cmp.addedVaccinationCount()).toBe(1);
        expect(changed).toBe(1);
    });

    it('kesinleşmiş muayenede kilitli türü açmaz ve neden gösterilir', () => {
        const el = create({ ...exam, status: 'Finalized' } as ExaminationDetailVm);
        cmp.open('treatment');
        fixture.detectChanges();

        expect(cmp.drawerVisible()).toBeFalse();
        expect(el.querySelector('[data-testid="procedure-lock-reason"]')?.textContent).toContain('Muayene kesinleşti');
    });

    it('salt okunur kurumda ekleme kapanır ve neden gösterilir', () => {
        blocked = true;
        const el = create();

        expect(el.querySelector('[data-testid="procedure-lock-reason"]')?.textContent).toContain('salt okunur');
        cmp.open('treatment');
        expect(cmp.drawerVisible()).toBeFalse();
    });

    it('müşteri veya hayvanı olmayan muayenede ekleme kapalıdır', () => {
        create({ ...exam, petId: null } as ExaminationDetailVm);

        expect(cmp.state('treatment').disabled).toBeTrue();
        expect(cmp.state('treatment').reason).toContain('hayvan');
    });
});
