import { signal } from '@angular/core';
import { of } from 'rxjs';
import type { HospitalizationWardVm } from '@/app/entities/hospitalization-ward/models/hospitalization-ward-vm.model';
import type { HospitalizationWardsService } from '@/app/entities/hospitalization-ward/services/hospitalization-wards.service';
import { hospitalizationRoomInlineCreate, hospitalizationWardInlineCreate } from './hospitalization-location-inline-create.utils';

describe('yatış konumu yerinde ekleme (O1)', () => {
    const ward: HospitalizationWardVm = { id: 'w1', clinicId: 'c1', name: 'Kedi servisi', sortOrder: 0, isActive: true, rooms: [] };

    it('bölümü adla ekler ve listeye koyar', () => {
        const wards = signal([ward]);
        const service = { createWard: vi.fn().mockReturnValue(of('w2')) } as unknown as HospitalizationWardsService;
        let id = '';

        hospitalizationWardInlineCreate(service, 'c1', wards, true).create!(' Köpek servisi ').subscribe((v) => (id = String(v)));

        expect(service.createWard).toHaveBeenCalledWith('c1', { name: 'Köpek servisi', sortOrder: 1 });
        expect(id).toBe('w2');
        expect(wards().map((w) => w.name)).toEqual(['Kedi servisi', 'Köpek servisi']);
    });

    it('odayı seçili bölüme ekler; bölüm seçilmeden ekleme kapalıdır', () => {
        const wards = signal([ward]);
        const service = { createRoom: vi.fn().mockReturnValue(of('r1')) } as unknown as HospitalizationWardsService;

        expect(hospitalizationRoomInlineCreate(service, 'c1', '', wards, true).canCreate).toBe(false);

        hospitalizationRoomInlineCreate(service, 'c1', 'w1', wards, true).create!('Kafes 1').subscribe();

        expect(service.createRoom).toHaveBeenCalledWith('c1', 'w1', { name: 'Kafes 1', sortOrder: 0 });
        expect(wards()[0].rooms.map((r) => r.name)).toEqual(['Kafes 1']);
    });
});
