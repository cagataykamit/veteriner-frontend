import { mapCreateLabResultToApiBody, mapLabResultDetailDtoToEditVm, mapLabResultDetailDtoToVm } from '@/app/entities/lab-result/data/lab-result.mapper';
import type { LabResultDetailDto } from '@/app/entities/lab-result/models/lab-result-api.model';

const base = { clinicId: 'c1', petId: 'p1', testName: 'Biyokimya' };

describe('lab-result mapper — değer satırları (REF-001 Dilim 3)', () => {
    it('yalnız satır + tarih sonuç sayılır; satırlar gövdeye kırpılarak yazılır', () => {
        const body = mapCreateLabResultToApiBody({
            ...base,
            resultDateUtc: '2026-11-20T09:00:00.000Z',
            lines: [{ parameterName: ' ALT ', value: 120, unit: ' U/L ', referenceLow: 10, referenceHigh: 100 }]
        });

        expect(body.resultText).toBeNull();
        expect(body.lines).toEqual([{ parameterName: 'ALT', value: 120, unit: 'U/L', referenceLow: 10, referenceHigh: 100 }]);
    });

    it('satır var tarih yoksa yazılmaz', () => {
        expect(() => mapCreateLabResultToApiBody({ ...base, lines: [{ parameterName: 'ALT', value: 1, unit: null, referenceLow: null, referenceHigh: null }] })).toThrowError('LAB_RESULT_WRITE_RESULT_INCOMPLETE');
    });

    it('satır verilmezse gövdede lines alanı yok (PUT mevcut satırları korur)', () => {
        const body = mapCreateLabResultToApiBody({ ...base, resultDateUtc: '2026-11-20T09:00:00.000Z', resultText: 'Normal' });

        expect('lines' in body).toBe(false);
    });

    it('detay satırları sıraya göre, işaret ve önceki değerle eşlenir; düzenleme satırları yalnız girdi alanlarını taşır', () => {
        const dto: LabResultDetailDto = {
            id: 'l1',
            testName: 'Biyokimya',
            lines: [
                { id: 'b', sortOrder: 2, parameterName: 'Üre', value: 40, unit: 'mg/dL', flag: null, previous: null, trend: null },
                {
                    id: 'a',
                    sortOrder: 1,
                    parameterName: 'Glikoz',
                    value: 140.5,
                    unit: 'mg/dL',
                    referenceLow: 70,
                    referenceHigh: 120,
                    flag: 'High',
                    previous: { labResultId: 'l0', resultDateUtc: '2026-11-01T09:00:00Z', value: 110, flag: 'Normal' },
                    trend: 'Up'
                }
            ]
        };

        const vm = mapLabResultDetailDtoToVm(dto);

        expect(vm.lines.map((l) => l.parameterName)).toEqual(['Glikoz', 'Üre']);
        expect(vm.lines[0].flag).toBe('High');
        expect(vm.lines[0].previous?.value).toBe(110);
        expect(vm.lines[0].trend).toBe('Up');
        expect(vm.lines[1].referenceLow).toBeNull();

        expect(mapLabResultDetailDtoToEditVm(dto).lines[0]).toEqual({ parameterName: 'Glikoz', value: 140.5, unit: 'mg/dL', referenceLow: 70, referenceHigh: 120 });
    });

    it('lines alanı olmayan eski yanıt boş diziye düşer', () => {
        expect(mapLabResultDetailDtoToVm({ id: 'x' }).lines).toEqual([]);
    });
});
