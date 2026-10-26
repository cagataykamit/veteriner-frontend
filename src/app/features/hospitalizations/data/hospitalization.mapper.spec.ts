import {
    hospitalizationLocationLabel,
    hospitalizationsQueryToHttpParams,
    mapCreateHospitalizationToApiBody,
    mapHospitalizationDetailDtoToEditVm,
    mapHospitalizationListItemDtoToVm,
    mapHospitalizationUpsertFormToCreateRequest
} from '@/app/features/hospitalizations/data/hospitalization.mapper';

describe('hospitalization mapper — konum (HOSP-002)', () => {
    const base = { id: 'h1', petName: 'Pamuk', reason: 'Gözlem', admittedAtUtc: '2026-10-10T07:00:00Z' };

    it('oda varsa "Bölüm / Oda" gösterilir; serbest metin konum yedek kalır', () => {
        const vm = mapHospitalizationListItemDtoToVm({ ...base, roomId: 'r1', roomName: 'Kafes 1', wardName: 'Yoğun bakım', location: 'Yoğun bakım / Kafes 1' });

        expect(vm.roomId).toBe('r1');
        expect(vm.wardName).toBe('Yoğun bakım');
        expect(vm.roomName).toBe('Kafes 1');
        expect(vm.locationLabel).toBe('Yoğun bakım / Kafes 1');
    });

    it('oda yoksa eski serbest metin, o da yoksa boş etiket', () => {
        expect(mapHospitalizationListItemDtoToVm({ ...base, location: 'Kafes 3' }).locationLabel).toBe('Kafes 3');
        expect(mapHospitalizationListItemDtoToVm(base).locationLabel).toBe('');
        expect(mapHospitalizationListItemDtoToVm(base).roomId).toBeNull();
    });

    it('oda var ama adlar gelmezse konum metnine düşer; yalnız bölüm adı gelirse o yazılır', () => {
        expect(hospitalizationLocationLabel({ roomId: 'r1', roomName: null, wardName: null, location: 'Metin' })).toBe('Metin');
        expect(hospitalizationLocationLabel({ roomId: 'r1', roomName: null, wardName: 'Kedi servisi', location: '' })).toBe('Kedi servisi');
    });

    it('düzenleme VM roomId taşır; oda yoksa boş metin', () => {
        expect(mapHospitalizationDetailDtoToEditVm({ ...base, roomId: 'r1', rowVersion: 'v' }).roomId).toBe('r1');
        expect(mapHospitalizationDetailDtoToEditVm({ ...base, rowVersion: 'v' }).roomId).toBe('');
    });

    const write = { clinicId: 'c1', petId: 'p1', admittedAtUtc: '2026-10-10T07:00:00Z', reason: 'Gözlem' };

    it('yazma gövdesi: roomId seçildiyse gider, location ve clearRoom gitmez', () => {
        const body = mapCreateHospitalizationToApiBody({ ...write, roomId: ' r1 ' });

        expect(body.roomId).toBe('r1');
        expect('location' in body).toBe(false);
        expect('clearRoom' in body).toBe(false);
    });

    it('yazma gövdesi: clearRoom yalnız oda seçili değilken gider', () => {
        expect(mapCreateHospitalizationToApiBody({ ...write, clearRoom: true }).clearRoom).toBe(true);
        expect('clearRoom' in mapCreateHospitalizationToApiBody({ ...write, roomId: 'r1', clearRoom: true })).toBe(false);
        expect('clearRoom' in mapCreateHospitalizationToApiBody(write)).toBe(false);
    });

    it('form adaptörü boş oda seçimini null, clearRoom bayrağını boolean yapar', () => {
        const req = mapHospitalizationUpsertFormToCreateRequest({ ...write, roomId: '', clearRoom: undefined });

        expect(req.roomId).toBeNull();
        expect(req.clearRoom).toBe(false);
        expect(mapHospitalizationUpsertFormToCreateRequest({ ...write, roomId: 'r2', clearRoom: true }).roomId).toBe('r2');
    });
});

describe('hospitalization mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [dateFromUtc, dateToUtc] olarak gönderir', () => {
        const p = hospitalizationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });

        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın yatış doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = hospitalizationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);

        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = hospitalizationsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });

        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = hospitalizationsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });

        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate']) {
            expect(withDates.has(k)).toBe(false);
        }

        const none = hospitalizationsQueryToHttpParams({});

        expect(none.has('dateFromUtc')).toBe(false);
        expect(none.has('dateToUtc')).toBe(false);
    });

    it('yalnızca bitiş verilirse yalnızca dateToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = hospitalizationsQueryToHttpParams({ toDate: '2026-10-08' });

        expect(onlyTo.has('dateFromUtc')).toBe(false);
        expect(onlyTo.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = hospitalizationsQueryToHttpParams({ fromDate: 'abc', toDate: '  ' });

        expect(invalid.has('dateFromUtc')).toBe(false);
        expect(invalid.has('dateToUtc')).toBe(false);
    });
});
