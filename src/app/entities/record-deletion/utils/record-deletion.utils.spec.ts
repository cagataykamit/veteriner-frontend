import { isRecordDeleted } from './record-deletion.utils';

describe('isRecordDeleted (ADR-054)', () => {
    it('silinme anı doluysa silinmiştir; boş, yok ya da kayıt yoksa değildir', () => {
        expect(isRecordDeleted({ deletedAtUtc: '2026-11-23T10:00:00Z' })).toBe(true);
        expect(isRecordDeleted({ deletedAtUtc: null })).toBe(false);
        expect(isRecordDeleted(null)).toBe(false);
        expect(isRecordDeleted(undefined)).toBe(false);
    });
});
