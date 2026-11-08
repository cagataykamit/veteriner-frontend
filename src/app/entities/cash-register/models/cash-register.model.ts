/** Kasa (TIER-008, `CASH_REGISTERS_API_CONTRACT.md` §3.1). Her klinikte tek Ana kasa vardır; pasife alınamaz. */
export interface CashRegisterDto {
    id: string;
    clinicId: string;
    code: string;
    name: string;
    isMain: boolean;
    isActive: boolean;
}

/** Kasa giriş/çıkışının gelir/gider türü (kiracı geneli). */
export interface CashMovementCategoryDto {
    id: string;
    name: string;
    isActive: boolean;
}

export type CashMovementKind = 'In' | 'Out' | 'TransferIn' | 'TransferOut';
export type CashMovementDirection = 'In' | 'Out';

/** Kasa hareketi (§3.4); aktarım bacaklarında `transferId` ve karşı kasa dolu. */
export interface CashMovementDto {
    id: string;
    clinicId: string;
    cashRegisterId: string;
    cashRegisterName: string;
    kind: CashMovementKind;
    businessDate: string;
    amount: number;
    currency: string;
    categoryId: string | null;
    categoryName: string | null;
    description: string | null;
    transferId: string | null;
    counterpartCashRegisterId: string | null;
    counterpartCashRegisterName: string | null;
    createdByUserId: string;
    createdByName: string | null;
    createdAtUtc: string;
    isVoided: boolean;
    voidedAtUtc: string | null;
    voidedByName: string | null;
    voidReason: string | null;
}

export interface CashMovementPageDto {
    items: CashMovementDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Kasanın dönem toplamları; `netAmount` beklenen nakdin ve bakiyenin tek hesabıdır (sunucu hesaplar). */
export interface CashRegisterTotalsDto {
    cashNetAmount: number;
    inAmount: number;
    outAmount: number;
    transferInAmount: number;
    transferOutAmount: number;
    netAmount: number;
}

export type CashRegisterReportRowKind = 'Collection' | 'CollectionVoid' | 'CreditRefund' | 'In' | 'Out' | 'TransferIn' | 'TransferOut';

export interface CashRegisterReportRowDto {
    businessDate: string;
    atUtc: string;
    kind: CashRegisterReportRowKind;
    referenceId: string;
    cashRegisterId: string | null;
    cashRegisterName: string;
    description: string;
    inAmount: number;
    outAmount: number;
    balance: number;
    performedByName: string | null;
}

/** Kasa hareketleri raporu (§3.6): devreden, dönemin satırları, dönem sonu. Kasa verilmezse klinikteki tüm kasalar. */
export interface CashRegisterReportDto {
    clinicId: string;
    cashRegisterId: string | null;
    cashRegisterName: string | null;
    from: string;
    to: string;
    currency: string;
    openingBalance: number;
    totals: CashRegisterTotalsDto;
    closingBalance: number;
    rows: CashRegisterReportRowDto[];
}

export interface CreateCashMovementBody {
    clinicId: string;
    cashRegisterId: string;
    direction: CashMovementDirection;
    businessDate: string;
    amount: number;
    categoryId: string;
    description: string | null;
}

export interface CreateCashTransferBody {
    clinicId: string;
    sourceCashRegisterId: string;
    targetCashRegisterId: string;
    businessDate: string;
    amount: number;
    description: string | null;
}

/** Sunucu kuralları (`CashMovement`, `CashRegister`); doğrusu backend'dedir. */
export const CASH_MOVEMENT_MAX_AMOUNT = 10_000_000;
export const CASH_MOVEMENT_DESCRIPTION_MAX = 500;
export const CASH_REGISTER_CODE_MAX = 20;
export const CASH_REGISTER_NAME_MAX = 100;

export const CASH_REGISTER_REPORT_KIND_LABELS: Readonly<Record<CashRegisterReportRowKind, string>> = {
    Collection: 'Nakit tahsilat',
    CollectionVoid: 'Tahsilat iptali',
    CreditRefund: 'Kredi iadesi',
    In: 'Kasa girişi',
    Out: 'Kasa çıkışı',
    TransferIn: 'Gelen aktarım',
    TransferOut: 'Giden aktarım'
};

export const CASH_MOVEMENT_KIND_LABELS: Readonly<Record<CashMovementKind, string>> = {
    In: 'Giriş',
    Out: 'Çıkış',
    TransferIn: 'Gelen aktarım',
    TransferOut: 'Giden aktarım'
};
