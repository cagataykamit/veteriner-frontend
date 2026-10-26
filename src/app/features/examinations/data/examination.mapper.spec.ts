import {
    examinationsQueryToHttpParams,
    isPartialVitalClear,
    mapCreateExaminationToApiBody,
    mapExaminationDetailDtoToEditVm,
    mapExaminationDetailDtoToVm,
    mapExaminationStatus,
    mapExaminationFormToCreateRequest,
    mapExaminationFormToUpdateRequest,
    mapExaminationRelatedSummaryDtoToVm,
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
    status: 'Draft',
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
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm(), current({ appointmentId: null }))!);

        expect('appointmentId' in body).toBe(false);
    });

    it('geçersiz tarih/saatte istek üretmez', () => {
        expect(mapExaminationFormToUpdateRequest(baseForm({ examinationTime: '' }), current())).toBeNull();
    });

    it('boşaltılan metin alanları null değil "" olarak gider (null mevcut değeri korurdu); visitReason kırpılır', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ anamnesis: '   ' }), current())!);

        expect(body.anamnesis).toBe('');
        expect(body.findings).toBe('');
        expect(body.assessment).toBe('');
        expect(body.plan).toBe('');
        expect(body.notes).toBe('');
        expect(body.visitReason).toBe('İştahsızlık');
    });

    it('dolu metin kırpılarak gider', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ plan: '  Sıvı tedavisi ' }), current())!);

        expect(body.plan).toBe('Sıvı tedavisi');
    });

    it('kayıtta vital yokken vital girilmezse vital alanları ve clearVitals hiç gönderilmez', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ vitalsMeasuredAtLocal: '2026-10-08T13:30' }), current())!);

        for (const k of ['weightKg', 'temperatureC', 'heartRateBpm', 'respiratoryRatePerMin', 'vitalsMeasuredAtUtc', 'clearVitals']) {
            expect(k in body, k).toBe(false);
        }
    });

    it('kayıttaki tüm vitaller bilinçli boşaltılırsa yalnızca clearVitals:true gider', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm(), current({ weightKg: 4.25, temperatureC: 38.6, vitalsMeasuredAtUtc: '2026-10-08T10:30:00Z' }))!);

        expect(body.clearVitals).toBe(true);

        for (const k of ['weightKg', 'temperatureC', 'heartRateBpm', 'respiratoryRatePerMin', 'vitalsMeasuredAtUtc']) {
            expect(k in body, k).toBe(false);
        }
    });

    it('vital değerler varken clearVitals gönderilmez', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ weightKg: 5 }), current({ weightKg: 4.25 }))!);

        expect('clearVitals' in body).toBe(false);
        expect(body.weightKg).toBe(5);
    });

    it('clearVitals isteği vital değerler taşısa bile gövdede vital değer bulunmaz', () => {
        const req = mapExaminationFormToUpdateRequest(baseForm({ weightKg: 5 }), current())!;
        const body = mapUpdateExaminationToApiBody({ ...req, clearVitals: true });

        expect(body.clearVitals).toBe(true);
        expect('weightKg' in body).toBe(false);
        expect('vitalsMeasuredAtUtc' in body).toBe(false);
    });

    it('her istekte rowVersion, examinedAtUtc ve visitReason gider', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm(), current())!);

        expect(body.rowVersion).toBeTruthy();
        expect(body.examinedAtUtc).toBe('2026-10-08T10:30:00.000Z');
        expect(body.visitReason).toBeTruthy();
    });
    it('değişmeyen ölçüm zamanını saniyesiyle birlikte aynen korur', () => {
        const orig = '2026-10-08T10:30:45Z';
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ weightKg: 4.25, vitalsMeasuredAtLocal: '2026-10-08T13:30' }), current({ vitalsMeasuredAtUtc: orig }))!);

        expect(body.vitalsMeasuredAtUtc).toBe(orig);
        expect(body.weightKg).toBe(4.25);
    });

    it('değişen ölçüm zamanını İstanbul duvar saatinden UTC ye çevirir', () => {
        const body = mapUpdateExaminationToApiBody(mapExaminationFormToUpdateRequest(baseForm({ temperatureC: 38.6, vitalsMeasuredAtLocal: '2026-10-08T14:00' }), current({ vitalsMeasuredAtUtc: '2026-10-08T10:30:00Z' }))!);

        expect(body.vitalsMeasuredAtUtc).toBe('2026-10-08T11:00:00.000Z');
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
        expect('rowVersion' in body).toBe(false);
        expect(body.visitId).toBeNull();
    });

    it('Visit bağlamında yalnızca visitId gider; klinik, hayvan ve randevu sunucuda Visit ten türetilir', () => {
        const req = mapExaminationFormToCreateRequest(baseForm(), {
            clinicId: 'clinic-1',
            petId: 'pet-1',
            appointmentId: 'appt-9',
            visitId: ' visit-1 '
        })!;
        const body = mapCreateExaminationToApiBody(req);

        expect(body.visitId).toBe('visit-1');
        expect(body.clinicId).toBeNull();
        expect(body.petId).toBeNull();
        expect(body.appointmentId).toBeNull();
        expect(body.visitReason).toBe('İştahsızlık');
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
            expect(withDates.has(k)).toBe(false);
        }

        const none = examinationsQueryToHttpParams({});

        expect(none.has('dateFromUtc')).toBe(false);
        expect(none.has('dateToUtc')).toBe(false);
    });

    it('yalnızca başlangıç verilirse yalnızca dateFromUtc gider', () => {
        const p = examinationsQueryToHttpParams({ fromDate: '2026-10-08' });

        expect(p.has('dateFromUtc')).toBe(true);
        expect(p.has('dateToUtc')).toBe(false);
    });
});

describe('isPartialVitalClear', () => {
    const none = { weightKg: null, temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null };

    it('kayıttaki bir vital boşaltılıp başkası kalırsa true', () => {
        expect(isPartialVitalClear({ ...none, temperatureC: 38 }, { ...none, weightKg: 4, temperatureC: 38 })).toBe(true);
    });

    it('tümü boşaltılırsa, hiç değişmezse veya yeni vital eklenirse false', () => {
        expect(isPartialVitalClear(none, { ...none, weightKg: 4 })).toBe(false);
        expect(isPartialVitalClear({ ...none, weightKg: 4 }, { ...none, weightKg: 4 })).toBe(false);
        expect(isPartialVitalClear({ ...none, weightKg: 4 }, none)).toBe(false);
    });
});

describe('examination mapper — durum (kesinleştirme)', () => {
    it('yalnız Finalized kilitli sayılır; eksik, eski ve bilinmeyen değer Taslak', () => {
        expect(mapExaminationStatus('Finalized')).toBe('Finalized');
        expect(mapExaminationStatus(' finalized ')).toBe('Finalized');
        expect(mapExaminationStatus('Draft')).toBe('Draft');
        expect(mapExaminationStatus(undefined)).toBe('Draft');
        expect(mapExaminationStatus('Weird')).toBe('Draft');
    });

    it('detay VM kesinleşme bilgisini taşır; eski kayıtta (alan yok) Taslak ve null', () => {
        const done = mapExaminationDetailDtoToVm({
            id: 'e1',
            status: 'Finalized',
            finalizedAtUtc: '2026-10-11T09:30:00Z',
            finalizedByName: 'Dr. Ayşe',
            rowVersion: 'V2'
        });

        expect(done).toEqual(expect.objectContaining({ status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z', finalizedByName: 'Dr. Ayşe', rowVersion: 'V2' }));

        const legacy = mapExaminationDetailDtoToVm({ id: 'e2' });

        expect(legacy).toEqual(expect.objectContaining({ status: 'Draft', finalizedAtUtc: null, finalizedByName: null }));
    });

    it('düzenleme VM i durumu taşır', () => {
        expect(mapExaminationDetailDtoToEditVm({ id: 'e1', status: 'Finalized' }).status).toBe('Finalized');
        expect(mapExaminationDetailDtoToEditVm({ id: 'e1' }).status).toBe('Draft');
    });
});

describe('mapExaminationRelatedSummaryDtoToVm vaccinations', () => {
    it('aşı bloğunu eşler; durum string enum, bilinmeyen/eksik alanlar güvenli', () => {
        const vm = mapExaminationRelatedSummaryDtoToVm({
            examinationId: 'e1',
            vaccinations: [
                { id: 'v1', vaccineName: ' Kuduz ', status: 'Applied', appliedAtUtc: '2026-10-08T09:00:00Z', clinicName: 'Merkez' },
                { id: 'v2', vaccineName: 'Karma', status: 'Scheduled', dueAtUtc: '2026-11-01T09:00:00Z' },
                { id: 'v3', status: 'Cancelled' },
                { id: ' ' }
            ]
        });

        expect(vm.vaccinations.map((v) => [v.id, v.vaccineName, v.status])).toEqual([
            ['v1', 'Kuduz', 'Applied'],
            ['v2', 'Karma', 'Scheduled'],
            ['v3', 'Aşı kaydı', 'Cancelled']
        ]);
        expect(vm.vaccinations[0].clinicName).toBe('Merkez');
        expect(vm.vaccinations[1].dueAtUtc).toBe('2026-11-01T09:00:00Z');
    });

    it('pendingChargeCount eşlenir; yoksa null (yetki yok), 0 ile karışmaz', () => {
        expect(mapExaminationRelatedSummaryDtoToVm({ examinationId: 'e1', pendingChargeCount: 2 }).pendingChargeCount).toBe(2);
        expect(mapExaminationRelatedSummaryDtoToVm({ examinationId: 'e1', pendingChargeCount: 0 }).pendingChargeCount).toBe(0);
        expect(mapExaminationRelatedSummaryDtoToVm({ examinationId: 'e1' }).pendingChargeCount).toBeNull();
    });

    it('vaccinations yoksa boş dizi döner', () => {
        expect(mapExaminationRelatedSummaryDtoToVm({ examinationId: 'e1' }).vaccinations).toEqual([]);
    });
});

describe('mapExaminationRelatedSummaryDtoToVm imaging', () => {
    it('görüntüleme bloğunu eşler; durum string enum, rozet ve eksik alanlar güvenli', () => {
        const vm = mapExaminationRelatedSummaryDtoToVm({
            examinationId: 'e1',
            imaging: [{ id: 'i1', performedAtUtc: '2026-10-08T09:00:00Z', modality: 'XRay', description: ' Sol arka bacak ', status: 'Active', addedAfterFinalization: true, clinicName: 'Merkez' }, { id: 'i2', status: 'Cancelled' }, { id: ' ' }]
        });

        expect(vm.imaging.map((i) => [i.id, i.modality, i.description, i.cancelled, i.addedAfterFinalization])).toEqual([
            ['i1', 'XRay', 'Sol arka bacak', false, true],
            ['i2', '', null, true, false]
        ]);
        expect(vm.imaging[0].clinicName).toBe('Merkez');
    });

    it('imaging yoksa boş dizi döner', () => {
        expect(mapExaminationRelatedSummaryDtoToVm({ examinationId: 'e1' }).imaging).toEqual([]);
    });
});
