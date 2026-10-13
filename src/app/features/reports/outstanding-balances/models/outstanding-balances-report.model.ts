/** Borç raporu tablo satırı; telefon yoksa `null`. */
export interface OutstandingBalanceRowVm {
    /** Ortak rapor satır anahtarı (`reportTableRowTrackKey`) için müşteri kimliği. */
    readonly id: string;
    readonly clientId: string;
    readonly clientName: string;
    readonly phone: string | null;
    readonly outstandingAmount: number;
    readonly openChargeCount: number;
    readonly oldestOpenChargeAtUtc: string;
}

export interface OutstandingBalancesReportResultVm {
    readonly items: readonly OutstandingBalanceRowVm[];
    readonly totalCount: number;
    /** Süzgece uyan tüm müşterilerin kalan toplamı (yalnız sayfa değil). */
    readonly totalOutstandingAmount: number;
    readonly currency: string;
    readonly page: number;
    readonly pageSize: number;
}
