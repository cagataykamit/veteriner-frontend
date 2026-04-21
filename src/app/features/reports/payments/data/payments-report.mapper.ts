import type { PaymentListItemDto } from '@/app/features/payments/models/payment-api.model';
import { mapPaymentListItemDtoToVm } from '@/app/features/payments/data/payment.mapper';
import type { PaymentReportRowVm, PaymentsReportResultVm } from '@/app/features/reports/payments/models/payments-report.model';
import type { PaymentsReportDto } from '@/app/features/reports/payments/models/payments-report-api.model';

const EM = '—';

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

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function toFiniteNumber(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) {
        return v;
    }
    if (typeof v === 'string' && v.trim()) {
        const n = Number.parseFloat(v.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export function mapPaymentListItemDtoToReportRow(dto: PaymentListItemDto): PaymentReportRowVm {
    const vm = mapPaymentListItemDtoToVm(dto);
    const clinicName = firstTrimmed(dto.clinicName, readDtoString(dto, ['ClinicName']));
    const clinicLabel = clinicName ?? EM;
    const notesRaw = firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note']));
    const notes = notesRaw ?? EM;
    return { ...vm, clinicLabel, notes };
}

export function mapPaymentsReportDtoToVm(raw: PaymentsReportDto, q: { page: number; pageSize: number }): PaymentsReportResultVm {
    const items = (raw.items ?? []).map(mapPaymentListItemDtoToReportRow);
    const totalCount = toFiniteNumber(raw.totalCount) ?? 0;
    const totalAmount = toFiniteNumber(raw.totalAmount) ?? 0;
    const totalPages = q.pageSize > 0 ? Math.max(1, Math.ceil(totalCount / q.pageSize)) : 1;
    return {
        items,
        totalCount,
        totalAmount,
        page: q.page,
        pageSize: q.pageSize,
        totalPages
    };
}
