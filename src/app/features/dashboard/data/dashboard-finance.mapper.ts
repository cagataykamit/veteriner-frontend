import type {
    DashboardFinanceRecentPaymentItemDto,
    DashboardFinanceRecentPaymentVm,
    DashboardFinanceSummaryDto,
    DashboardFinanceSummaryVm
} from '@/app/features/dashboard/models/dashboard-finance.model';
import { buildSevenDayTrendPoints, parseLastSevenDayPaidAmounts } from '@/app/features/dashboard/utils/dashboard-trend.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
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

function mapRecentPayment(dto: DashboardFinanceRecentPaymentItemDto): DashboardFinanceRecentPaymentVm | null {
    const id = dto.id?.trim();
    if (!id) {
        return null;
    }
    return {
        id,
        paidAtUtc: dto.paidAtUtc?.trim() ? dto.paidAtUtc.trim() : null,
        clientId: dto.clientId?.trim() ? dto.clientId.trim() : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId.trim() : null,
        petName: dto.petName?.trim() ? dto.petName.trim() : null,
        amount: safeNum(dto.amount),
        currency: dto.currency?.trim() ? dto.currency.trim() : null,
        method: dto.method
    };
}

export function mapDashboardFinanceSummaryDtoToVm(dto: DashboardFinanceSummaryDto): DashboardFinanceSummaryVm {
    return {
        last7DaysPaidTrend: buildSevenDayTrendPoints(parseLastSevenDayPaidAmounts(dto.last7DaysPaid)),
        todayTotalPaid: safeNum(dto.todayTotalPaid),
        weekTotalPaid: safeNum(dto.weekTotalPaid),
        monthTotalPaid: safeNum(dto.monthTotalPaid),
        todayPaymentsCount: dto.todayPaymentsCount ?? null,
        weekPaymentsCount: dto.weekPaymentsCount ?? null,
        monthPaymentsCount: dto.monthPaymentsCount ?? null,
        recentPayments: (dto.recentPayments ?? []).map(mapRecentPayment).filter((x): x is NonNullable<typeof x> => x != null)
    };
}
