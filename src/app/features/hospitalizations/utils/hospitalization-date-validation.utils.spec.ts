import { FormControl, FormGroup } from '@angular/forms';
import {
    HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY,
    hospitalizationPlannedBeforeAdmissionMessage,
    hospitalizationPlannedDischargeMin,
    plannedDischargeNotBeforeAdmissionValidator
} from './hospitalization-date-validation.utils';

describe('planlı taburcu / yatış tarihi kuralı', () => {
    const group = (admitted: string, planned: string) =>
        new FormGroup(
            { admittedAtLocal: new FormControl(admitted), plannedDischargeAtLocal: new FormControl(planned) },
            { validators: [plannedDischargeNotBeforeAdmissionValidator()] }
        );

    it('planlı taburcu yatıştan önceyse hata verir', () => {
        expect(group('2026-10-12T10:00', '1991-11-24T15:30').hasError(HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY)).toBeTrue();
        expect(group('2026-10-12T10:00', '2026-10-12T09:59').hasError(HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY)).toBeTrue();
    });

    it('eşit veya sonraki değer geçerli', () => {
        expect(group('2026-10-12T10:00', '2026-10-12T10:00').valid).toBeTrue();
        expect(group('2026-10-12T10:00', '2026-10-15T08:00').valid).toBeTrue();
    });

    it('biri boş veya çözümlenemezse bu kural susar (zorunluluk/biçim başka denetimde)', () => {
        expect(group('2026-10-12T10:00', '').valid).toBeTrue();
        expect(group('', '2026-10-12T10:00').valid).toBeTrue();
        expect(group('2026-10-12', '2026-10-11T10:00').valid).toBeTrue();
    });

    it('planlı taburcu alt sınırı: geçerli yatış tarihi, yoksa yedek sınır', () => {
        expect(hospitalizationPlannedDischargeMin('2026-10-12T10:00', '1900-01-01T00:00')).toBe('2026-10-12T10:00');
        expect(hospitalizationPlannedDischargeMin('', '1900-01-01T00:00')).toBe('1900-01-01T00:00');
        expect(hospitalizationPlannedDischargeMin('2026-10-1', '1900-01-01T00:00')).toBe('1900-01-01T00:00');
    });
});

describe('hospitalizationPlannedBeforeAdmissionMessage', () => {
    it('yatış tarih ve saatini mesaja koyar', () => {
        expect(hospitalizationPlannedBeforeAdmissionMessage('2026-10-13T19:00')).toBe('Planlı taburcu, yatış tarihinden (13.10.2026 19:00) önce olamaz.');
    });

    it('yatış tarihi çözümlenemezse saatsiz genel mesaj verir', () => {
        expect(hospitalizationPlannedBeforeAdmissionMessage('')).toBe('Planlı taburcu, yatış tarihinden önce olamaz.');
    });
});
