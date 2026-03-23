import { HttpParams } from '@angular/common/http';
import type {
    PaymentCreateRequestDto,
    PaymentDetailDto,
    PaymentListItemDto,
    PaymentListItemDtoPagedResult
} from '@/app/features/payments/models/payment-api.model';
import type { CreatePaymentRequest } from '@/app/features/payments/models/payment-create.model';
import type { PaymentsListQuery } from '@/app/features/payments/models/payment-query.model';
import type { PaymentDetailVm, PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function num(v: number | null | undefined): number | null {
    if (v == null || Number.isNaN(Number(v))) {
        return null;
    }
    return Number(v);
}

export function mapPaymentListItemDtoToVm(dto: PaymentListItemDto): PaymentListItemVm {
    const currency = dto.currency?.trim() ? dto.currency!.trim() : 'TRY';
    return {
        id: dto.id,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        amount: num(dto.amount),
        currency,
        status: dto.status?.trim() ? dto.status : null,
        method: dto.method?.trim() ? dto.method : null,
        dueDateUtc: dto.dueDateUtc ?? null,
        paidAtUtc: dto.paidAtUtc ?? null,
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapPaymentDetailDtoToVm(dto: PaymentDetailDto): PaymentDetailVm {
    const currency = dto.currency?.trim() ? dto.currency!.trim() : 'TRY';
    return {
        id: dto.id,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        amount: num(dto.amount),
        currency,
        status: dto.status?.trim() ? dto.status : null,
        method: dto.method?.trim() ? dto.method : null,
        note: str(dto.note),
        dueDateUtc: dto.dueDateUtc ?? null,
        paidAtUtc: dto.paidAtUtc ?? null,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
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
        p = p.set('ClientId', query.clientId.trim());
    }
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.status?.trim()) {
        p = p.set('Status', query.status.trim());
    }
    if (query.method?.trim()) {
        p = p.set('Method', query.method.trim());
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
    const body: PaymentCreateRequestDto = {
        clientId: req.clientId.trim(),
        petId: req.petId.trim(),
        amount: req.amount,
        currency: req.currency.trim(),
        method: req.method.trim(),
        status: req.status.trim()
    };
    if (req.dueDateUtc?.trim()) {
        body.dueDateUtc = req.dueDateUtc.trim();
    } else {
        body.dueDateUtc = null;
    }
    if (req.paidAtUtc?.trim()) {
        body.paidAtUtc = req.paidAtUtc.trim();
    } else {
        body.paidAtUtc = null;
    }
    if (req.note?.trim()) {
        body.note = req.note.trim();
    } else {
        body.note = null;
    }
    return body;
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
