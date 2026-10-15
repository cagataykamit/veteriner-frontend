import { FormControl } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { parsePetRouteContext, prefillPetFromRoute } from './examination-create-route-context.utils';

describe('hayvan rota bağlamı', () => {
    const params = (o: Record<string, string>) => convertToParamMap(o);

    it('müşteri ve hayvan birlikte varsa bağlam okunur; biri eksikse null', () => {
        expect(parsePetRouteContext(params({ clientId: ' c1 ', petId: 'p1' }))).toEqual({ clientId: 'c1', petId: 'p1' });
        expect(parsePetRouteContext(params({ clientId: 'c1' }))).toBeNull();
        expect(parsePetRouteContext(params({ petId: 'p1' }))).toBeNull();
    });

    it('geliş, muayene, randevu veya tedavi bağlamı varsa hayvan bağlamı sayılmaz (o bağlamlar baskındır)', () => {
        for (const k of ['visitId', 'examinationId', 'appointmentId', 'treatmentId']) {
            expect(parsePetRouteContext(params({ clientId: 'c1', petId: 'p1', [k]: 'x' }))).toBeNull();
        }
    });

    it('prefillPetFromRoute müşteri ve hayvan kontrollerini doldurur; bağlam yoksa dokunmaz', () => {
        const client = new FormControl('', { nonNullable: true });
        const pet = new FormControl('', { nonNullable: true });

        expect(prefillPetFromRoute(params({ clientId: 'c1', petId: 'p1' }), client, pet)).toBeTrue();
        expect([client.value, pet.value]).toEqual(['c1', 'p1']);
        const c2 = new FormControl('', { nonNullable: true });
        const p2 = new FormControl('', { nonNullable: true });

        expect(prefillPetFromRoute(params({ clientId: 'c1' }), c2, p2)).toBeFalse();
        expect([c2.value, p2.value]).toEqual(['', '']);
    });
});
