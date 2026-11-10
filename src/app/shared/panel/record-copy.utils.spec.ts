import { convertToParamMap } from '@angular/router';
import { copyTargetExaminationId, recordCopyQueryParams, recordCopySourceId } from './record-copy.utils';

describe('record-copy.utils (RECORD-004)', () => {
    it('kaynak kimliği sorgudan okunur ve aynı anahtarla yazılır', () => {
        expect(recordCopySourceId(convertToParamMap(recordCopyQueryParams('rx1')))).toBe('rx1');
        expect(recordCopySourceId(convertToParamMap({ copyFrom: '  ' }))).toBeNull();
        expect(recordCopySourceId(convertToParamMap({}))).toBeNull();
    });

    it('hedef muayene: yalnız tek açık (taslak) muayene varsa önerilir', () => {
        expect(copyTargetExaminationId([{ id: 'e1', status: 'Finalized' }, { id: 'e2', status: 'Draft' }])).toBe('e2');
        expect(copyTargetExaminationId([{ id: 'e1', status: 'Draft' }, { id: 'e2', status: 'Draft' }])).toBeNull();
        expect(copyTargetExaminationId([{ id: 'e1', status: 'Finalized' }])).toBeNull();
        expect(copyTargetExaminationId([{ id: 'e1' }])).toBeNull();
    });
});
