import { formatDateInputValue, parseDateInputValue } from './date-input-value.utils';

describe('date-input-value utils', () => {
    it('date: metin ↔ Date gidiş-dönüş aynı kalır', () => {
        const d = parseDateInputValue('date', '2026-10-11')!;
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 11]);
        expect(formatDateInputValue('date', d)).toBe('2026-10-11');
    });

    it('datetime-local: saat ve dakika korunur (saniye varsa yok sayılır)', () => {
        const d = parseDateInputValue('datetime-local', '2026-10-11T13:30:45')!;
        expect([d.getHours(), d.getMinutes()]).toEqual([13, 30]);
        expect(formatDateInputValue('datetime-local', d)).toBe('2026-10-11T13:30');
    });

    it('time: HH:mm', () => {
        expect(formatDateInputValue('time', parseDateInputValue('time', '09:05'))).toBe('09:05');
    });

    it('date türü datetime metnini de kabul eder (yalnız gün alınır)', () => {
        expect(formatDateInputValue('date', parseDateInputValue('date', '2026-10-11T22:15'))).toBe('2026-10-11');
    });

    it('gün-gece sınırı: 23:59 ve 00:00 tarih kaymaz (saat dilimi dönüşümü yok)', () => {
        expect(formatDateInputValue('datetime-local', parseDateInputValue('datetime-local', '2026-10-11T23:59'))).toBe('2026-10-11T23:59');
        expect(formatDateInputValue('datetime-local', parseDateInputValue('datetime-local', '2026-10-11T00:00'))).toBe('2026-10-11T00:00');
    });

    it('geçersiz takvim günleri ve saatler null', () => {
        expect(parseDateInputValue('date', '2026-02-30')).toBeNull();
        expect(parseDateInputValue('date', '2026-13-01')).toBeNull();
        expect(parseDateInputValue('datetime-local', '2026-10-11T24:00')).toBeNull();
        expect(parseDateInputValue('datetime-local', '2026-10-11T12:60')).toBeNull();
        expect(parseDateInputValue('time', '25:00')).toBeNull();
    });

    it('boş, boşluk ve biçim dışı metin null', () => {
        expect(parseDateInputValue('date', '')).toBeNull();
        expect(parseDateInputValue('date', '  ')).toBeNull();
        expect(parseDateInputValue('date', null)).toBeNull();
        expect(parseDateInputValue('date', '11.10.2026')).toBeNull();
        expect(parseDateInputValue('datetime-local', '2026-10-11')).not.toBeNull(); // gün başı
    });

    it('iki haneli yıl 19xx olmaz: yıl 0026 olduğu gibi korunur', () => {
        const d = parseDateInputValue('date', '0026-01-01')!;
        expect(d.getFullYear()).toBe(26);
        expect(formatDateInputValue('date', d)).toBe('0026-01-01');
    });

    it('boş Date biçimlenince boş metin', () => {
        expect(formatDateInputValue('date', null)).toBe('');
        expect(formatDateInputValue('date', new Date(NaN))).toBe('');
    });
});
