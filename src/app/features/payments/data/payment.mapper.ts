import { HttpParams } from '@angular/common/http';
import type {
    PaymentCreateRequestDto,
    PaymentDetailDto,
    PaymentListItemDto,
    PaymentListItemDtoPagedResult
} from '@/app/features/payments/models/payment-api.model';
import type { CreatePaymentRequest } from '@/app/features/payments/models/payment-create.model';
import type { PaymentsListQuery } from '@/app/features/payments/models/payment-query.model';
import type { PaymentDetailVm, PaymentEditVm, PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import {
    paymentMethodCanonicalToApiEnum,
    resolvePaymentMethodFormValue
} from '@/app/features/payments/utils/payment-method.utils';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

function readDtoString(dto: unknown, keys: string[]): string | null {
    if (!isRecord(dto)) {
        return null;
    }
    for (const k of keys) {
        if (!(k in dto)) {
            continue;
        }
        const v = dto[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function num(v: number | string | null | undefined): number | null {
    if (v == null || Number.isNaN(Number(v))) {
        return null;
    }
    return Number(v);
}

function canonicalClientId(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId, readDtoString(dto, ['ClientId', 'OwnerId', 'CustomerId']));
}

function canonicalClientName(dto: PaymentListItemDto): string {
    return str(
        firstTrimmed(
            dto.clientName,
            dto.ownerName,
            readDtoString(dto, ['ClientName', 'OwnerName', 'CustomerName', 'customerName'])
        )
    );
}

function canonicalPetId(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: PaymentListItemDto): string {
    return str(firstTrimmed(dto.petName, dto.animalName, readDtoString(dto, ['PetName', 'AnimalName', 'PatientName'])));
}

function canonicalAmount(dto: PaymentListItemDto): number | null {
    return num(dto.amount ?? dto.totalAmount ?? dto.paymentAmount);
}

function canonicalCurrency(dto: PaymentListItemDto): string {
    return firstTrimmed(dto.currency, dto.currencyCode) ?? 'TRY';
}

function canonicalStatus(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.status, dto.paymentStatus, dto.lifecycleStatus, dto.lifecycle);
}

/** method / paymentMethod sayı veya string olabilir (backend enum 0/1/2). */
function readRawMethodFromUnknown(dto: unknown): unknown {
    if (!isRecord(dto)) {
        return null;
    }
    const keys = ['method', 'paymentMethod', 'methodType', 'Method', 'PaymentMethod', 'MethodType'];
    for (const k of keys) {
        if (!(k in dto)) {
            continue;
        }
        const v = dto[k];
        if (v === null || v === undefined) {
            continue;
        }
        if (typeof v === 'string' && !v.trim()) {
            continue;
        }
        return v;
    }
    return null;
}

function canonicalMethodFromListDto(dto: PaymentListItemDto): string | null {
    return resolvePaymentMethodFormValue(readRawMethodFromUnknown(dto));
}

function detailClientId(dto: PaymentDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId']));
}

function detailClientName(dto: PaymentDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])));
}

function detailPetId(dto: PaymentDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId']));
}

function detailPetName(dto: PaymentDetailDto): string {
    return str(firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])));
}

function detailAmount(dto: PaymentDetailDto): number | null {
    return num(dto.amount);
}

function detailCurrency(dto: PaymentDetailDto): string {
    return firstTrimmed(dto.currency, readDtoString(dto, ['Currency'])) ?? 'TRY';
}

function detailPaidAt(dto: PaymentDetailDto): string | null {
    return firstTrimmed(dto.paidAtUtc, readDtoString(dto, ['PaidAtUtc']));
}

function detailNotes(dto: PaymentDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])));
}

function canonicalDueDate(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.dueDateUtc, dto.dueAtUtc);
}

function canonicalPaidAt(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.paidAtUtc, dto.paymentDateUtc, dto.paidOnUtc);
}

function canonicalCreatedAt(dto: PaymentListItemDto): string | null {
    return firstTrimmed(dto.createdAtUtc, dto.createdOnUtc);
}

export function mapPaymentListItemDtoToVm(dto: PaymentListItemDto): PaymentListItemVm {
    return {
        id: dto.id,
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        amount: canonicalAmount(dto),
        currency: canonicalCurrency(dto),
        status: canonicalStatus(dto),
        method: canonicalMethodFromListDto(dto),
        dueDateUtc: canonicalDueDate(dto),
        paidAtUtc: canonicalPaidAt(dto),
        createdAtUtc: canonicalCreatedAt(dto)
    };
}

export function mapPaymentDetailDtoToVm(dto: PaymentDetailDto): PaymentDetailVm {
    return {
        id: dto.id,
        clientId: detailClientId(dto),
        clientName: detailClientName(dto),
        petId: detailPetId(dto),
        petName: detailPetName(dto),
        amount: detailAmount(dto),
        currency: detailCurrency(dto),
        method: resolvePaymentMethodFormValue(readRawMethodFromUnknown(dto)),
        note: detailNotes(dto),
        paidAtUtc: detailPaidAt(dto)
    };
}

export function mapPaymentDetailDtoToEditVm(dto: PaymentDetailDto): PaymentEditVm {
    const amount = detailAmount(dto);
    return {
        id: dto.id,
        clientId: detailClientId(dto) ?? '',
        petId: detailPetId(dto) ?? '',
        amountStr: amount != null ? String(amount) : '',
        currency: detailCurrency(dto),
        method: resolvePaymentMethodFormValue(readRawMethodFromUnknown(dto)) ?? 'cash',
        paidAtUtc: detailPaidAt(dto),
        note: firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])) ?? ''
    };
}

export function mapPagedPaymentsToVm(result: PaymentListItemDtoPagedResult): {
    items: PaymentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapPaymentListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Page, PageSize, Search, Status, Method, FromDate, ToDate, Sort, Order */
export function paymentsQueryToHttpParams(query: PaymentsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.clientId?.trim()) {
        const clientId = query.clientId.trim();
        p = p.set('ClientId', clientId);
        p = p.set('OwnerId', clientId);
    }
    if (query.petId?.trim()) {
        const petId = query.petId.trim();
        p = p.set('PetId', petId);
        p = p.set('AnimalId', petId);
    }
    if (query.appointmentId?.trim()) {
        p = p.set('AppointmentId', query.appointmentId.trim());
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.status?.trim()) {
        const status = query.status.trim();
        p = p.set('Status', status);
        p = p.set('PaymentStatus', status);
        p = p.set('LifecycleStatus', status);
    }
    if (query.method?.trim()) {
        const method = query.method.trim();
        p = p.set('Method', method);
        p = p.set('PaymentMethod', method);
    }
    if (query.fromDate?.trim()) {
        p = p.set('FromDate', query.fromDate.trim());
    }
    if (query.toDate?.trim()) {
        p = p.set('ToDate', query.toDate.trim());
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    return p;
}

export function mapCreatePaymentToApiBody(req: CreatePaymentRequest): PaymentCreateRequestDto {
    const clientId = req.clientId.trim();
    const petId = req.petId?.trim() ? req.petId.trim() : null;
    const clinicId = req.clinicId?.trim() ? req.clinicId.trim() : null;
    const appointmentId = req.appointmentId?.trim() ? req.appointmentId.trim() : null;
    const examinationId = req.examinationId?.trim() ? req.examinationId.trim() : null;
    const notes = req.notes?.trim() ? req.notes.trim() : null;
    const paidAtUtc = req.paidAtUtc?.trim() ?? '';
    if (!paidAtUtc) {
        throw new Error('PAYMENT_WRITE_PAID_AT_REQUIRED');
    }
    const body: PaymentCreateRequestDto = {
        clinicId,
        clientId,
        petId,
        appointmentId,
        examinationId,
        amount: req.amount,
        currency: req.currency.trim(),
        method: paymentMethodCanonicalToApiEnum(req.method),
        paidAtUtc,
        notes
    };
    return body;
}

export interface PaymentUpsertFormAdapterInput {
    clinicId: string;
    clientId: string;
    petId: string;
    amount: number;
    currency: string;
    method: string;
    paidAtUtc: string;
    note?: string | null;
}

export function mapPaymentUpsertFormToCreateRequest(input: PaymentUpsertFormAdapterInput): CreatePaymentRequest {
    return {
        clinicId: input.clinicId.trim(),
        clientId: input.clientId.trim(),
        petId: input.petId.trim(),
        amount: input.amount,
        currency: input.currency.trim(),
        method: input.method.trim(),
        paidAtUtc: input.paidAtUtc.trim(),
        notes: input.note?.trim() ? input.note.trim() : null
    };
}

export function filterPaymentListByStatus(
    items: PaymentListItemVm[],
    status: string | null | undefined
): PaymentListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = normalizeFilterKey(s);
    return items.filter((i) => {
        const st = (i.status ?? '').trim();
        if (!st) {
            return false;
        }
        return normalizeFilterKey(st) === target;
    });
}

export function filterPaymentListByMethod(
    items: PaymentListItemVm[],
    method: string | null | undefined
): PaymentListItemVm[] {
    const m = method?.trim();
    if (!m) {
        return items;
    }
    const target = normalizeFilterKey(m);
    return items.filter((i) => {
        const mt = (i.method ?? '').trim();
        if (!mt) {
            return false;
        }
        return normalizeFilterKey(mt) === target;
    });
}

export function filterPaymentList(
    items: PaymentListItemVm[],
    status: string | null | undefined,
    method: string | null | undefined
): PaymentListItemVm[] {
    return filterPaymentListByMethod(filterPaymentListByStatus(items, status), method);
}
