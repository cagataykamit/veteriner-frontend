/** GET `/api/v1/reports/outstanding-balances` — `docs/OUTSTANDING_BALANCE_REPORT_API_CONTRACT.md`. */
export interface OutstandingBalanceItemDto {
    clientId: string;
    clientName: string;
    phone?: string | null;
    outstandingAmount: number;
    openChargeCount: number;
    oldestOpenChargeAtUtc: string;
}

export interface OutstandingBalancesReportDto {
    currency?: string | null;
    totalCount: number;
    totalOutstandingAmount: number;
    items?: OutstandingBalanceItemDto[] | null;
}
