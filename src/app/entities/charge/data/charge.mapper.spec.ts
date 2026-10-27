import { chargesQueryToHttpParams, mapChargeCreateResultDtoToVm, mapChargeDtoToVm, mapCorrectChargeToApiBody, mapCreateChargeToApiBody, mapPagedChargesToVm } from '@/app/entities/charge/data/charge.mapper';
import type { ChargeDto } from '@/app/entities/charge/models/charge-api.model';

const dto = (over: Partial<ChargeDto> = {}): ChargeDto => ({
    id: 'ch1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    visitId: null,
    examinationId: null,
    description: 'Genel muayene',
    quantity: 1,
    unitPrice: 750,
    amount: 750,
    allocatedAmount: 250,
    outstandingAmount: 500,
    currency: 'TRY',
    createdByUserId: 'u1',
    createdAtUtc: '2026-10-10T07:00:00Z',
    ...over
});

describe('charge mapper — okuma', () => {
    it('DTO yu VM ye eşler; boş opsiyonelleri null yapar', () => {
        const vm = mapChargeDtoToVm(dto({ petId: ' ', petName: null, visitId: ' v1 ' }));

        expect(vm.petId).toBeNull();
        expect(vm.petName).toBeNull();
        expect(vm.visitId).toBe('v1');
        expect(vm.amount).toBe(750);
        expect(vm.currency).toBe('TRY');
    });

    it('ödenen ve kalan tutarı eşler; eski yanıtta yoksa null', () => {
        const vm = mapChargeDtoToVm(dto());

        expect(vm.allocatedAmount).toBe(250);
        expect(vm.outstandingAmount).toBe(500);
        const old = mapChargeDtoToVm(dto({ allocatedAmount: undefined, outstandingAmount: undefined }));

        expect(old.allocatedAmount).toBeNull();
        expect(old.outstandingAmount).toBeNull();
    });

    it('boş müşteri adı için tire gösterir', () => {
        expect(mapChargeDtoToVm(dto({ clientName: ' ' })).clientName).toBe('—');
    });

    it('sayfalı sonucu eşler; items null ise boş dizi', () => {
        const vm = mapPagedChargesToVm({ items: null, page: 2, pageSize: 20, totalItems: 25, totalPages: 2 });

        expect(vm).toEqual({ items: [], page: 2, pageSize: 20, totalItems: 25, totalPages: 2 });
        expect(mapPagedChargesToVm({ items: [dto()], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }).items[0].id).toBe('ch1');
    });

    it('create sonucunda created bayrağını korur', () => {
        const vm = mapChargeCreateResultDtoToVm({ created: false, charge: dto() });

        expect(vm.created).toBe(false);
        expect(vm.charge.id).toBe('ch1');
    });
});

describe('charge mapper — yazma ve sorgu', () => {
    it('istek gövdesinde tutar ve para birimi yoktur; boşlar null, metinler kırpılır', () => {
        const body = mapCreateChargeToApiBody(' c1 ', {
            clientId: ' cl1 ',
            petId: '',
            visitId: null,
            examinationId: ' ex1 ',
            description: '  Mama  ',
            quantity: 2,
            unitPrice: 10.5,
            requestId: 'rid'
        });

        expect(body).toEqual({
            clinicId: 'c1',
            clientId: 'cl1',
            petId: null,
            visitId: null,
            examinationId: 'ex1',
            description: 'Mama',
            quantity: 2,
            unitPrice: 10.5,
            requestId: 'rid'
        });
        expect('amount' in body).toBe(false);
        expect('currency' in body).toBe(false);
    });

    it('satır türü ve KDV (ADR-036): okumada eski yanıt hizmet/varsayılan; yazmada tax nesnesi', () => {
        expect(mapChargeDtoToVm(dto()).lineKind).toBe('Service');
        expect(mapChargeDtoToVm(dto()).vatRate).toBeNull();
        expect(mapChargeDtoToVm(dto({ lineKind: 'Product', vatRate: 10 }))).toEqual(expect.objectContaining({ lineKind: 'Product', vatRate: 10 }));

        const base = { clientId: 'cl1', description: 'Mama', quantity: 1, unitPrice: 100, requestId: 'rid' };

        expect(mapCreateChargeToApiBody('c1', { ...base, lineKind: 'Product', vatRate: null }).tax).toEqual({ lineKind: 'Product', vatRate: null });
        expect('tax' in mapCreateChargeToApiBody('c1', base)).toBe(false);
        expect(mapCorrectChargeToApiBody({ description: 'Mama', quantity: 1, unitPrice: 100, reason: 'KDV yanlış', lineKind: 'Service', vatRate: 20 }).tax).toEqual({
            lineKind: 'Service',
            vatRate: 20
        });
    });

    it('liste sorgusu varsayılan sayfalama ve yalnız dolu filtreleri gönderir', () => {
        const p = chargesQueryToHttpParams({ clinicId: 'c1', clientId: ' cl1 ', petId: ' ' });

        expect(p.get('page')).toBe('1');
        expect(p.get('pageSize')).toBe('20');
        expect(p.get('clinicId')).toBe('c1');
        expect(p.get('clientId')).toBe('cl1');
        expect(p.has('petId')).toBe(false);
        expect(p.has('visitId')).toBe(false);
    });
});
