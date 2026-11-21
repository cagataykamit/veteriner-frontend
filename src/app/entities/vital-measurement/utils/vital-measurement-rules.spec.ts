import { VITAL_SIGNS } from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { formatVitalValue, hasAnyVitalValue, measuredAtError, parseVitalInput, vitalInputError, vitalSummary, vitalValuesFromInputs } from '@/app/entities/vital-measurement/utils/vital-measurement-rules';

const [temperature, heartRate, respiratoryRate, weight] = VITAL_SIGNS;
const NOW = Date.parse('2026-11-20T11:20:00Z');

describe('vital ölçümü kuralları', () => {
    it('giriş metni: boş null, virgül ve nokta ondalık, sayı olmayan NaN', () => {
        expect(parseVitalInput('')).toBeNull();
        expect(parseVitalInput('  ')).toBeNull();
        expect(parseVitalInput('38,6')).toBe(38.6);
        expect(parseVitalInput('38.6')).toBe(38.6);
        expect(parseVitalInput('120')).toBe(120);
        expect(parseVitalInput('abc')).toBeNaN();
        expect(parseVitalInput('-3')).toBeNaN();
        expect(parseVitalInput('1,2,3')).toBeNaN();
    });

    it('aralıklar sözleşmedeki gibi: ateş 25–45, nabız 1–400, solunum 1–200, kilo 0,01–9999,99', () => {
        expect(vitalInputError(temperature, '25')).toBeNull();
        expect(vitalInputError(temperature, '45')).toBeNull();
        expect(vitalInputError(temperature, '24,9')).toBe('Ateş 25,0–45,0 °C arasında olmalı.');
        expect(vitalInputError(temperature, '45,1')).not.toBeNull();
        expect(vitalInputError(heartRate, '400')).toBeNull();
        expect(vitalInputError(heartRate, '401')).toBe('Nabız 1–400 atım/dk arasında olmalı.');
        expect(vitalInputError(heartRate, '0')).not.toBeNull();
        expect(vitalInputError(respiratoryRate, '200')).toBeNull();
        expect(vitalInputError(respiratoryRate, '201')).not.toBeNull();
        expect(vitalInputError(weight, '0,01')).toBeNull();
        expect(vitalInputError(weight, '9999,99')).toBeNull();
        expect(vitalInputError(weight, '10000')).not.toBeNull();
        expect(vitalInputError(weight, '0')).not.toBeNull();
    });

    it('aralık yuvarlamadan sonra denetlenir (sunucudaki gibi)', () => {
        // 45,04 → 45,0 (geçerli); 45,05 → 45,1 (aralık dışı)
        expect(vitalInputError(temperature, '45,04')).toBeNull();
        expect(vitalInputError(temperature, '45,05')).not.toBeNull();
    });

    it('nabız ve solunum tam sayıdır; boş alan hata değildir', () => {
        expect(vitalInputError(heartRate, '12,5')).toBe('Tam sayı girin.');
        expect(vitalInputError(respiratoryRate, '24.5')).toBe('Tam sayı girin.');
        expect(vitalInputError(heartRate, '')).toBeNull();
        expect(vitalInputError(temperature, 'x')).toBe('Sayı girin.');
    });

    it('gönderilecek değerler yuvarlanır; boş alan null kalır', () => {
        const values = vitalValuesFromInputs({ temperatureC: '38,25', heartRateBpm: '120', respiratoryRatePerMin: '', weightKg: '12,345' });

        expect(values).toEqual({ temperatureC: 38.3, heartRateBpm: 120, respiratoryRatePerMin: null, weightKg: 12.35 });
        expect(hasAnyVitalValue(values)).toBe(true);
        expect(hasAnyVitalValue(vitalValuesFromInputs({ temperatureC: '', heartRateBpm: '', respiratoryRatePerMin: '', weightKg: '' }))).toBe(false);
    });

    it('ölçüm zamanı: ileri olamaz (5 dk pay), en çok 7 gün geriye, yatıştan önce olamaz', () => {
        expect(measuredAtError('2026-11-20T11:24:00Z', NOW, null)).toBeNull();
        expect(measuredAtError('2026-11-20T11:26:00Z', NOW, null)).toBe('Ölçüm zamanı ileri bir zaman olamaz.');
        expect(measuredAtError('2026-11-13T11:30:00Z', NOW, null)).toBeNull();
        expect(measuredAtError('2026-11-13T11:00:00Z', NOW, null)).toBe('Ölçüm zamanı en çok 7 gün geriye girilebilir.');
        expect(measuredAtError('2026-11-18T05:00:00Z', NOW, '2026-11-18T06:00:00Z')).toBe('Ölçüm zamanı yatıştan önce olamaz.');
        expect(measuredAtError('2026-11-18T06:00:00Z', NOW, '2026-11-18T06:00:00Z')).toBeNull();
        expect(measuredAtError('bozuk', NOW, null)).toBe('Geçerli bir ölçüm zamanı girin.');
    });

    it('özet metni zaman çizelgesiyle aynı biçimdedir; boş değer yazılmaz', () => {
        expect(vitalSummary({ temperatureC: 38.6, heartRateBpm: 120, respiratoryRatePerMin: 24, weightKg: 12.45 })).toBe('38,6 °C · Nabız 120/dk · Solunum 24/dk · 12,45 kg');
        expect(vitalSummary({ temperatureC: 39, heartRateBpm: null, respiratoryRatePerMin: null, weightKg: null })).toBe('39,0 °C');
        expect(formatVitalValue(weight, 12.4)).toBe('12,4');
    });
});
