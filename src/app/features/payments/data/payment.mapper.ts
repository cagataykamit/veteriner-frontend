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

/** Sunucu `petName` için null veya boş string dönebilir; `str()` ile birleştirilmez (EM yok). */
function detailPetName(dto: PaymentDetailDto): string {
    return firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])) ?? '';
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

function detailAppointmentId(dto: PaymentDetailDto): string | null {
    return firstTrimmed(dto.appointmentId, readDtoString(dto, ['AppointmentId']));
}

function detailExaminationId(dto: PaymentDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalPaidAtList(dto: PaymentListItemDto): string | null {
    return dto.paidAtUtc?.trim() ? dto.paidAtUtc.trim() : null;
}

function listPetNameFromDto(petName: string | null | undefined): string {
    return petName == null ? '' : String(petName).trim();
}

export function mapPaymentListItemDtoToVm(dto: PaymentListItemDto): PaymentListItemVm {
    const clientId = dto.clientId?.trim() ? dto.clientId.trim() : null;
    const petId = dto.petId?.trim() ? dto.petId.trim() : null;
    return {
        id: dto.id,
        clientId,
        clientName: str(dto.clientName?.trim() ?? null),
        petId,
        petName: listPetNameFromDto(dto.petName),
        amount: num(dto.amount),
        currency: dto.currency?.trim() ? dto.currency.trim() : 'TRY',
        method: canonicalMethodFromListDto(dto),
        paidAtUtc: canonicalPaidAtList(dto)
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
        paidAtUtc: detailPaidAt(dto),
        appointmentId: detailAppointmentId(dto),
        examinationId: detailExaminationId(dto)
    };
}

export function mapPaymentDetailDtoToEditVm(dto: PaymentDetailDto): PaymentEditVm {
    const amount = detailAmount(dto);
    return {
        id: dto.id,
        clientId: detailClientId(dto) ?? '',
        petId: detailPetId(dto) ?? '',
        appointmentId: detailAppointmentId(dto),
        examinationId: detailExaminationId(dto),
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

/** GET `/api/v1/payments` — canonical query: `Page`, `PageSize`, `Search`, `ClientId`, `PetId`, `Method`, `FromDate`, `ToDate` (+ `clinicId`). */
export function paymentsQueryToHttpParams(query: PaymentsListQuery, opts?: { omitPaging?: boolean }): HttpParams {
    let p = new HttpParams();
    if (!opts?.omitPaging) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 10;
        p = p.set('Page', String(page));
        p = p.set('PageSize', String(pageSize));
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.method?.trim()) {
        try {
            const enumVal = paymentMethodCanonicalToApiEnum(query.method.trim());
            p = p.set('Method', String(enumVal));
        } catch {
            /* bilinmeyen yöntem — parametre gönderme */
        }
    }
    if (query.paidFromDate?.trim()) {
        p = p.set('FromDate', query.paidFromDate.trim());
    }
    if (query.paidToDate?.trim()) {
        p = p.set('ToDate', query.paidToDate.trim());
    }
    return p;
}

export function mapCreatePaymentToApiBody(req: CreatePaymentRequest): PaymentCreateRequestDto {
    const clientId = req.clientId.trim();
    const petId = req.petId?.trim() ? req.petId.trim() : null;
    const clinicId = req.clinicId.trim();
    if (!clinicId) {
        throw new Error('PAYMENT_WRITE_CLINIC_ID_REQUIRED');
    }
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
    /** Boş veya atlanmış — API gövdesinde null. */
    petId?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount: number;
    currency: string;
    method: string;
    paidAtUtc: string;
    note?: string | null;
}

export function mapPaymentUpsertFormToCreateRequest(input: PaymentUpsertFormAdapterInput): CreatePaymentRequest {
    const petRaw = input.petId;
    const petId = typeof petRaw === 'string' && petRaw.trim() ? petRaw.trim() : null;
    return {
        clinicId: input.clinicId.trim(),
        clientId: input.clientId.trim(),
        petId,
        appointmentId: input.appointmentId?.trim() ? input.appointmentId.trim() : null,
        examinationId: input.examinationId?.trim() ? input.examinationId.trim() : null,
        amount: input.amount,
        currency: input.currency.trim(),
        method: input.method.trim(),
        paidAtUtc: input.paidAtUtc.trim(),
        notes: input.note?.trim() ? input.note.trim() : null
    };
}
