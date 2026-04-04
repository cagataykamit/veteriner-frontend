import { HttpParams } from '@angular/common/http';
import { parseAppointmentStatusRawToEnum } from '@/app/features/appointments/utils/appointment-status.utils';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type {
    ClientUpsertRequestDto,
    ClientDetailDto,
    ClientListItemDto,
    ClientListItemDtoPagedResult,
    ClientPaymentSummaryDto,
    ClientRecentAppointmentSummaryItemDto,
    ClientRecentExaminationSummaryItemDto,
    ClientRecentSummaryDto
} from '@/app/features/clients/models/client-api.model';
import type { CreateClientRequest } from '@/app/features/clients/models/client-create.model';
import type {
    ClientDetailVm,
    ClientListItemVm,
    ClientPaymentSummaryVm,
    ClientRecentSummaryVm
} from '@/app/features/clients/models/client-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { ClientsListQuery } from '@/app/features/clients/models/client-query.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

export function mapClientListItemDtoToVm(dto: ClientListItemDto): ClientListItemVm {
    return {
        id: dto.id,
        fullName: str(dto.fullName),
        phone: str(dto.phone),
        email: dto.email?.trim() ? dto.email : EM,
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

/**
 * Create form → API body.
 * Backend bazı alanları istemiyorsa burada çıkarılır (Swagger ile hizalanır).
 */
/**
 * POST /clients yanıtından oluşturulan müşteri kimliğini çıkarır.
 * Doğrudan `ClientDetailDto`, sarmalayıcı `data`/`value` veya PascalCase alan adları için küçük uyum katmanı.
 */
export function extractCreatedClientIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        const t = body.trim();
        return t ? t : null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'clientId', 'ClientId'];
    for (const k of idKeys) {
        const s = pickIdString(o[k]);
        if (s) {
            return s;
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'client', 'Client'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const s = pickIdString(n[k]);
                if (s) {
                    return s;
                }
            }
        }
    }
    return null;
}

function pickIdString(v: unknown): string | null {
    if (typeof v === 'string' && v.trim()) {
        return v.trim();
    }
    if (typeof v === 'number' && !Number.isNaN(v)) {
        return String(v);
    }
    return null;
}

export function mapCreateClientToApiBody(req: CreateClientRequest): ClientUpsertRequestDto {
    const email = req.email?.trim() ? req.email.trim() : null;
    const address = req.address?.trim() ? req.address.trim() : null;
    const phone = req.phone?.trim() ? req.phone.trim() : null;
    return {
        fullName: req.fullName.trim(),
        phone,
        email,
        address
    };
}

function mapClientRecentAppointmentItemToVm(dto: ClientRecentAppointmentSummaryItemDto): AppointmentListItemVm {
    const notesRaw = dto.notes?.trim() ? dto.notes.trim() : null;
    const status = parseAppointmentStatusRawToEnum(dto.status);
    return {
        id: dto.id,
        scheduledAtUtc: dto.scheduledAtUtc ?? null,
        clientId: null,
        clientName: EM,
        petId: dto.petId?.trim() ? dto.petId.trim() : null,
        petName: str(dto.petName),
        speciesName: null,
        appointmentType: null,
        appointmentTypeName: null,
        status,
        lifecycleStatus: null,
        notes: notesRaw
    };
}

function mapClientRecentExaminationItemToVm(dto: ClientRecentExaminationSummaryItemDto): ExaminationListItemVm {
    return {
        id: dto.id,
        clinicId: null,
        clinicName: EM,
        examinedAtUtc: dto.examinedAtUtc ?? null,
        clientId: null,
        clientName: EM,
        petId: dto.petId?.trim() ? dto.petId.trim() : null,
        petName: str(dto.petName),
        appointmentId: null,
        visitReason: str(dto.visitReason)
    };
}

export function mapClientRecentSummaryDtoToVm(dto: ClientRecentSummaryDto): ClientRecentSummaryVm {
    return {
        clientId: dto.clientId?.trim() ?? '',
        appointments: (dto.recentAppointments ?? []).map(mapClientRecentAppointmentItemToVm),
        examinations: (dto.recentExaminations ?? []).map(mapClientRecentExaminationItemToVm)
    };
}

function safeNum(v: unknown): number | null {
    if (v == null) {
        return null;
    }
    if (typeof v === 'number' && !Number.isNaN(v)) {
        return v;
    }
    return null;
}

/** GET /clients/{id}/payment-summary → VM. */
export function mapClientPaymentSummaryDtoToVm(dto: ClientPaymentSummaryDto): ClientPaymentSummaryVm {
    const currencyTotals = (dto.currencyTotals ?? [])
        .map((x) => {
            const c = x.currency?.trim();
            if (!c) {
                return null;
            }
            return {
                currency: c,
                totalAmount: safeNum(x.totalAmount)
            };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

    const recentPayments = (dto.recentPayments ?? [])
        .map((x) => {
            const id = x.id?.trim();
            if (!id) {
                return null;
            }
            return {
                id,
                paidAtUtc: x.paidAtUtc?.trim() ? x.paidAtUtc.trim() : null,
                clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                petId: x.petId?.trim() ? x.petId.trim() : null,
                petName: x.petName?.trim() ? x.petName.trim() : null,
                amount: safeNum(x.amount),
                currency: x.currency?.trim() ? x.currency.trim() : null,
                method: x.method,
                notes: x.notes?.trim() ? x.notes.trim() : null
            };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

    return {
        clientId: dto.clientId?.trim() ?? '',
        clientName: str(dto.clientName),
        totalPaymentsCount: dto.totalPaymentsCount ?? 0,
        totalPaidAmount: safeNum(dto.totalPaidAmount),
        currencyTotals,
        lastPaymentAtUtc: dto.lastPaymentAtUtc?.trim() ? dto.lastPaymentAtUtc.trim() : null,
        recentPayments
    };
}

export function mapClientDetailDtoToVm(dto: ClientDetailDto): ClientDetailVm {
    return {
        id: dto.id,
        fullName: str(dto.fullName),
        phone: str(dto.phone),
        email: str(dto.email),
        address: dto.address?.trim() ? dto.address : EM,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapPagedClientsToVm(result: ClientListItemDtoPagedResult): {
    items: ClientListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapClientListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Page, PageSize, search, Sort, Order */
export function clientsQueryToHttpParams(query: ClientsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    return p;
}

