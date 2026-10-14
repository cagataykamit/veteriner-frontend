import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { VaccinationsService, type VaccinationsPagedVm } from '@/app/features/vaccinations/services/vaccinations.service';
import { PetCardDataService } from './pet-card-data.service';

describe('PetCardDataService', () => {
    let claims: Set<string>;
    let service: PetCardDataService;
    const vaccinations = jasmine.createSpyObj<VaccinationsService>('VaccinationsService', ['getVaccinations']);
    const labResults = jasmine.createSpyObj<LabResultsService>('LabResultsService', ['getLabResults']);
    const clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClientBalance']);

    const collect = <T>(source: { subscribe(fn: (v: PetCardSection<T>) => void): unknown }) => {
        const values: PetCardSection<T>[] = [];
        source.subscribe((v) => values.push(v));
        return values;
    };

    beforeEach(() => {
        claims = new Set(['Vaccinations.Read', 'LabResults.Read']);
        vaccinations.getVaccinations.calls.reset();
        clients.getClientBalance.calls.reset();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: VaccinationsService, useValue: vaccinations },
                { provide: LabResultsService, useValue: labResults },
                { provide: ClientsService, useValue: clients },
                { provide: ChargeSuggestionsService, useValue: {} },
                { provide: ExaminationsService, useValue: {} },
                { provide: TreatmentsService, useValue: {} }
            ]
        });
        service = TestBed.inject(PetCardDataService);
    });

    it('planlanmış aşıları hayvana süzülmüş ister; önce yükleniyor, sonra veri yayar', () => {
        vaccinations.getVaccinations.and.returnValue(
            of({ items: [{ id: 'v1', petId: 'p1' }, { id: 'v2', petId: 'p9' }], page: 1, pageSize: 50, totalItems: 2, totalPages: 1 } as unknown as VaccinationsPagedVm)
        );

        const values = collect(service.scheduledVaccinations('p1'));

        expect(vaccinations.getVaccinations).toHaveBeenCalledWith(jasmine.objectContaining({ petId: 'p1', status: '0' }));
        expect(values.length).toBe(2);
        expect(values[0]).toEqual({ state: 'loading' });
        const last = values[1];
        expect(last?.state === 'ok' ? last.data.map((v) => v.id) : null).toEqual(['v1']);
    });

    it('okuma izni yoksa istek atmadan null yayar; hata akışı kırmaz, error durumu olur', () => {
        expect(collect(service.ownerBalance('c1'))).toEqual([null]);
        expect(clients.getClientBalance).not.toHaveBeenCalled();

        labResults.getLabResults.and.returnValue(throwError(() => new Error('x')));
        expect(collect(service.requestedLabs('p1'))).toEqual([{ state: 'loading' }, { state: 'error' }]);
    });

    it('sahibi olmayan hayvanda bakiye ve muayenesiz hayvanda muayene detayı istenmez', () => {
        claims.add('Charges.Read');
        claims.add('Examinations.Read');
        expect(collect(service.ownerBalance(null))).toEqual([null]);
        expect(collect(service.examination(null))).toEqual([null]);
    });
});
