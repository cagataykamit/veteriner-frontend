import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AuthService } from '@/app/core/auth/auth.service';
import type { VaccinationDetailVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VaccinationDetailPageComponent } from './vaccination-detail-page.component';

const vm = (examinationId: string | null): VaccinationDetailVm => ({
    id: 'v1',
    appliedAtUtc: '2026-10-08T10:30:00Z',
    dueAtUtc: null,
    vaccineName: 'Karma',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    status: 1,
    notes: '—',
    examinationId,
    createdAtUtc: null,
    updatedAtUtc: null
});

describe('VaccinationDetailPageComponent — muayene bağlantısı', () => {
    const render = (examinationId: string | null): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [VaccinationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'v1' })) } },
                { provide: VaccinationsService, useValue: { getVaccinationById: () => of(vm(examinationId)) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(VaccinationDetailPageComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('muayeneye bağlı aşıda muayene detayına bağlantı görünür', () => {
        const a = render('e1').querySelector('[data-testid="linked-examination"]');
        expect(a?.getAttribute('href')).toContain('/panel/examinations/e1');
    });

    it('muayeneye bağlı olmayan aşıda bağlantı yok', () => {
        expect(render(null).querySelector('[data-testid="linked-examination"]')).toBeNull();
    });
});
