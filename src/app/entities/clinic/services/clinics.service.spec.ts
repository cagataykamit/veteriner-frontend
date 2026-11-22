import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicsService } from './clinics.service';

describe('ClinicsService.listClinics', () => {
    let api: MockedObject<ApiClient>;
    let claims: Set<string>;

    beforeEach(() => {
        claims = new Set([CLINICS_READ_CLAIM]);
        api = { get: vi.fn().mockName('ApiClient.get') } as unknown as MockedObject<ApiClient>;
        api.get.mockReturnValue(of([{ id: 'c1', name: 'Merkez', isActive: true }]));
        TestBed.configureTestingModule({
            providers: [
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { getAccessToken: () => 'token', hasOperationClaim: (c: string) => claims.has(c) } }
            ]
        });
    });

    it('Clinics.Read ile listeyi okur', async () => {
        const list = await firstValueFrom(TestBed.inject(ClinicsService).listClinics());

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(list.map((c) => c.id)).toEqual(['c1']);
    });

    it('izin yoksa (hekim, sekreter) istek atmaz; hata yolundan döner', async () => {
        claims.clear();

        await expect(firstValueFrom(TestBed.inject(ClinicsService).listClinics())).rejects.toThrow('Klinik listesini görme yetkiniz yok.');
        expect(api.get).not.toHaveBeenCalled();
    });
});
