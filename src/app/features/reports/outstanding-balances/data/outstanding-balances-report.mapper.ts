import type { OutstandingBalancesReportDto } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report-api.model';
import type { OutstandingBalancesReportResultVm } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report.model';

export function mapOutstandingBalancesReportDtoToVm(
    raw: OutstandingBalancesReportDto,
    q: { page: number; pageSize: number }
): OutstandingBalancesReportResultVm {
    return {
        items: (raw.items ?? []).map((i) => ({
            id: i.clientId,
            clientId: i.clientId,
            clientName: i.clientName,
            phone: i.phone?.trim() || null,
            outstandingAmount: i.outstandingAmount,
            openChargeCount: i.openChargeCount,
            oldestOpenChargeAtUtc: i.oldestOpenChargeAtUtc
        })),
        totalCount: raw.totalCount ?? 0,
        totalOutstandingAmount: raw.totalOutstandingAmount ?? 0,
        currency: raw.currency?.trim() || 'TRY',
        page: q.page,
        pageSize: q.pageSize
    };
}
