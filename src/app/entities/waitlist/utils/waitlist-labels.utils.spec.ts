import type { WaitlistSlotDto } from '@/app/entities/waitlist/models/waitlist.model';
import { parseWaitlistDays, waitlistDaysBody, waitlistDaysText, waitlistSlotSummary } from './waitlist-labels.utils';

const slot = (over: Partial<WaitlistSlotDto> = {}): WaitlistSlotDto => ({
    appointmentId: 'a1',
    startUtc: '2026-11-11T07:00:00Z',
    durationMinutes: 30,
    veterinarianUserId: null,
    isReleased: true,
    autoOfferEnabled: true,
    eligibleCount: 2,
    blockedCount: 0,
    openOffer: null,
    isBooked: false,
    candidates: [],
    ...over
});

describe('waitlist-labels.utils (TIER-018)', () => {
    it('gün bayrakları sunucu biçimiyle gidip gelir', () => {
        expect(waitlistDaysBody([])).toBe('None');
        expect(waitlistDaysBody(['Monday', 'Friday'])).toBe('Monday, Friday');
        expect(parseWaitlistDays('Monday, Friday')).toEqual(['Monday', 'Friday']);
        expect(waitlistDaysText('None')).toBe('Her gün');
        expect(waitlistDaysText('Friday, Monday')).toBe('Pzt, Cum');
    });

    it('boşalan saat cümlesi uygun kişi sayısını ve teklif durumunu söyler', () => {
        expect(waitlistSlotSummary(slot())).toBe('Bekleme listesinde bu saate uygun 2 kişi var. Teklif sıradakine otomatik gider.');
        expect(waitlistSlotSummary(slot({ autoOfferEnabled: false, blockedCount: 1 }))).toContain('Otomatik teklif kapalı');
        expect(waitlistSlotSummary(slot({ autoOfferEnabled: false, blockedCount: 1 }))).toContain('1 kişiye e-posta gidemiyor');
        expect(waitlistSlotSummary(slot({ eligibleCount: 0, blockedCount: 0 }))).toBeNull();
        expect(waitlistSlotSummary(slot({ eligibleCount: 0, blockedCount: 2 }))).toContain('hiçbirine e-posta gidemiyor');
        expect(waitlistSlotSummary(slot({ isBooked: true }))).toBe('Bu saat bekleme listesinden doldu.');
    });
});
