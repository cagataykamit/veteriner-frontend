import {
    examinationsQueryToHttpParams,
    mapCreateExaminationToApiBody,
    mapExaminationDetailDtoToEditVm,
    mapExaminationFormToCreateRequest,
    mapExaminationFormToUpdateRequest,
    mapExaminationWriteResultDtoToVm,
    mapUpdateExaminationToApiBody
} from '@/app/features/examinations/data/examination.mapper';
import type { ExaminationWorkspaceFormValue } from '@/app/features/examinations/models/examination-form.model';
import type { ExaminationEditVm } from '@/app/features/examinations/models/examination-vm.model';

const baseForm = (over: Partial<ExaminationWorkspaceFormValue> = {}): ExaminationWorkspaceFormValue => ({
    examinationDate: '2026-10-08',
    examinationTime: '13:30',
    visitReason: ' İştahsızlık ',
    anamnesis: '',
    findings: '',
    weightKg: null,
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    vitalsMeasuredAtLocal: '',
    assessment: '',
    plan: '',
    notes: '',
    ...over
});

const current = (over: Partial<ExaminationEditVm> = {}): ExaminationEditVm => ({
    id: 'e1',
    clinicId: 'clinic-1',
    clientId: 'client-1',
    petId: 'pet-1',
    clientName: 'Ali',
    petName: 'Pamuk',
    appointmentId: 'appt-1',
    examinedAtUtc: '2026-10-08T10:30:00Z',
    visitReason: 'x',
    anamnesis: '',
    findings: '',
    weightKg: null,
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    vitalsMeasuredAtUtc: null,
    assessment: '',
    plan: '',
    notes: '',
    rowVersion: 'AQIDBAUGBwgJCgs=',
    ...over
});

describe('examination mapper — PUT gövdesi', () => {
    it('GET ten gelen rowVersion ı PUT gövdesine aynen taşır', () => {
        const req = mapExaminationFormToUpdateRequest(baseForm(), current())!;
        const body = mapUpdateExaminationToApiBody(req);
        expect(body.rowVersion).toBe('AQIDBAUGBwgJCgs=');
    });

    it('mevcut randevu bağlantısını aynı değerle gönderir; clinicId/petId kayıttan gelir', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm(), current())!);
        expect(body.appointmentId).toBe('appt-1');
        expect(body.clinicId).toBe('clinic-1');
        expect(body.petId).toBe('pet-1');
    });

    it('randevusuz kayıtta appointmentId alanını hiç göndermez (null ile bağlantı silinmez)', () => {
        const body = mapUpdateExaminationToApiBody(
            mapExaminationFormToUpdateRequest(baseForm(), current({ appointmentId: null }))!
        );
        expect('appointmentId' in body).toBeFalse();
    });

    it('geçersiz tarih/saatte istek üretmez', () => {
        expect(mapExaminationFormToUpdateRequest(baseForm({ examinationTime: '' }), current())).toBeNull();
    });

    it('vital yokken vitalsMeasuredAtUtc göndermez; ölçülmeyen vital null gider', () => {
        const body = mapUpdateExaminationToApiBody(
            mapExaminationFormToUpdateRequest(baseForm({ vitalsMeasuredAtLocal: '2026-10-08T13:30' }), current())!
        );
        expect(body.vitalsMeasuredAtUtc).toBeNull();
        expect(body.weightKg).toBeNull();
        expect(body.temperatureC).toBeNull();
    });

    it('değişmeyen ölçüm zamanını saniyesiyle birlikte aynen korur', () => {
        const orig = '2026-10-08T10:30:45Z';
        const body = mapUpdateExaminationToApiBody(
            mapExaminationFormToUpdateRequest(
                baseForm({ weightKg: 4.25, vitalsMeasuredAtLocal: '2026-10-08T13:30' }),
                current({ vitalsMeasuredAtUtc: orig })
            )!
        );
        expect(body.vitalsMeasuredAtUtc).toBe(orig);
        expect(body.weightKg).toBe(4.25);
    });

    it('değişen ölçüm zamanını İstanbul duvar saatinden UTC ye çevirir', () => {
        const body = mapUpdateExaminationToApiBody(
            mapExaminationFormToUpdateRequest(
                baseForm({ temperatureC: 38.6, vitalsMeasuredAtLocal: '2026-10-08T14:00' }),
                current({ vitalsMeasuredAtUtc: '2026-10-08T10:30:00Z' })
            )!
        );
        expect(body.vitalsMeasuredAtUtc).toBe('2026-10-08T11:00:00.000Z');
    });

    it('findings boşsa boş string, diğer boş metinler null gider; visitReason kırpılır', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm(), current())!);
        expect(body.findings).toBe('');
        expect(body.anamnesis).toBeNull();
        expect(body.plan).toBeNull();
        expect(body.assessment).toBeNull();
        expect(body.visitReason).toBe('İştahsızlık');
    });
});

describe('examination mapper — POST gövdesi', () => {
    it('rowVersion göndermez; randevudan gelen appointmentId taşınır', () => {
        const req = mapExaminationFormToCreateRequest(baseForm(), {
            clinicId: 'clinic-1',
            petId: 'pet-1',
            appointmentId: 'appt-9'
        })!;
        const body = mapCreateExaminationToApiBody(req);
        expect(body.appointmentId).toBe('appt-9');
        expect('rowVersion' in body).toBeFalse();
    });
});

describe('examination mapper — okuma', () => {
    it('eski kayıtta yeni alanlar null olunca edit VM bozulmaz', () => {
        const vm = mapExaminationDetailDtoToEditVm({
            id: 'e1',
            clinicId: 'c',
            petId: 'p',
            visitReason: 'a',
            findings: '',
            anamnesis: null,
            plan: null,
            weightKg: null,
            vitalsMeasuredAtUtc: null,
            rowVersion: 'AAA='
        });
        expect(vm.anamnesis).toBe('');
        expect(vm.plan).toBe('');
        expect(vm.findings).toBe('');
        expect(vm.weightKg).toBeNull();
        expect(vm.vitalsMeasuredAtUtc).toBeNull();
        expect(vm.rowVersion).toBe('AAA=');
    });

    it('POST/PUT yanıtından id ve yeni rowVersion ı okur', () => {
        expect(mapExaminationWriteResultDtoToVm({ id: 'e1', rowVersion: 'BwsMDQ4PEBESExQ=' })).toEqual({
            id: 'e1',
            rowVersion: 'BwsMDQ4PEBESExQ='
        });
        expect(mapExaminationWriteResultDtoToVm(null)).toBeNull();
    });
});

describe('examination mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü [dateFromUtc, dateToUtc) olarak gönderir; bitiş ertesi gün başlangıcıdır', () => {
        const p = examinationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T21:00:00.000Z');
    });

    it('gece yarısına yakın kayıt doğru İstanbul gününe düşer', () => {
        // 2026-10-08 23:59 İstanbul = 2026-10-08T20:59Z; 2026-10-09 00:01 İstanbul = 2026-10-08T21:01Z
        const p = examinationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThan(to);
        expect(Date.parse('2026-10-08T21:01:00Z')).toBeGreaterThanOrEqual(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün ertesi başlangıcıdır', () => {
        const p = examinationsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });
        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T21:00:00.000Z');
    });

    it('FromDate/ToDate ve examinedOnLocalDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = examinationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });
        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate', 'examinedOnLocalDate']) {
            expect(withDates.has(k)).toBeFalse();
        }
        const none = examinationsQueryToHttpParams({});
        expect(none.has('dateFromUtc')).toBeFalse();
        expect(none.has('dateToUtc')).toBeFalse();
    });

    it('yalnızca başlangıç verilirse yalnızca dateFromUtc gider', () => {
        const p = examinationsQueryToHttpParams({ fromDate: '2026-10-08' });
        expect(p.has('dateFromUtc')).toBeTrue();
        expect(p.has('dateToUtc')).toBeFalse();
    });
});
