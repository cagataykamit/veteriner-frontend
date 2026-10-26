import { HBS_STATUS_LABEL, mapHbsEntryDtoToVm, parseHbsStatus } from '@/app/features/hbs/utils/hbs-status.utils';

describe('hbs-status.utils', () => {
    it('yalnız bilinen durumlar okunur', () => {
        expect(parseHbsStatus('Entered')).toBe('Entered');
        expect(parseHbsStatus('entered')).toBeNull();
        expect(parseHbsStatus(null)).toBeNull();
    });

    it('etiketler nötrdür (zorunluluk iddiası yok)', () => {
        expect(Object.values(HBS_STATUS_LABEL).join(' ').toLowerCase()).not.toContain('zorunlu');
        expect(HBS_STATUS_LABEL.NotEntered).toBe("HBS'e girilmedi");
    });

    it('DTO → VM: boş metinler null, isTracked yoksa takipte sayılır, bilinmeyen durum null', () => {
        expect(mapHbsEntryDtoToVm({ status: 'NotRequired', referenceNumber: ' ', notRequiredReason: ' Gerek yok ' })).toEqual({
            status: 'NotRequired',
            referenceNumber: null,
            notRequiredReason: 'Gerek yok',
            markedAtUtc: null,
            markedByName: null,
            isTracked: true
        });
        expect(mapHbsEntryDtoToVm({ status: 'NotEntered', isTracked: false })?.isTracked).toBe(false);
        expect(mapHbsEntryDtoToVm({ status: 'X' as never })).toBeNull();
        expect(mapHbsEntryDtoToVm(undefined)).toBeNull();
    });
});
