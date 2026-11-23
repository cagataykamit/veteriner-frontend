/**
 * Müşteri ve hasta yumuşak silme (ADR-054; backend `docs/CLIENT_PET_DELETION_API_CONTRACT.md`). Kayıt veritabanında kalır;
 * listelerden ve hatırlatmalardan kalkar, "Silinenler"den geri yüklenir.
 */
export type DeletableRecordKind = 'client' | 'pet';

/** 409 `*.DeleteBlocked` yanıtındaki `reasons` değerleri; `OpenAccount` yalnız müşteride gelir. */
export type DeleteBlockReason = 'OpenAccount' | 'ActiveHospitalization' | 'OpenVisit' | 'FutureAppointments';

/** Engel nedenlerinin tamamı ve sayı ekleri (tek yanıtta). */
export interface DeleteBlockedVm {
    readonly reasons: readonly DeleteBlockReason[];
    readonly activeHospitalizationCount: number;
    readonly openVisitCount: number;
    readonly futureAppointmentCount: number;
}

/** `GET /clients/deleted` ve `GET /pets/deleted` sayfa iskeleti. */
export interface DeletedRecordsPageDto<T> {
    items?: T[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface DeletedClientDto {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    deletedAtUtc: string;
    deletedByUserId?: string | null;
    deletedByUserName?: string | null;
}

export interface DeletedPetDto {
    id: string;
    name?: string | null;
    speciesName?: string | null;
    clientId?: string | null;
    clientFullName?: string | null;
    /** `true` ise hasta geri yüklenemez; önce müşteri geri yüklenir. */
    clientIsDeleted?: boolean | null;
    deletedWithClient?: boolean | null;
    deletedAtUtc: string;
    deletedByUserId?: string | null;
    deletedByUserName?: string | null;
}

/** "Silinenler" listesinin satırı; müşteri ve hasta aynı biçimde gösterilir. */
export interface DeletedRecordRowVm {
    readonly kind: DeletableRecordKind;
    readonly id: string;
    readonly title: string;
    /** Müşteride telefon (yoksa e-posta), hastada tür. */
    readonly detail: string | null;
    /** Hastanın müşterisi; müşteri satırında `null`. */
    readonly clientId: string | null;
    readonly clientName: string | null;
    /** Hastanın müşterisi de silinmiş: geri yükleme yerine "Önce müşteriyi geri yükleyin". */
    readonly clientDeleted: boolean;
    readonly deletedWithClient: boolean;
    readonly deletedAtUtc: string;
    readonly deletedByUserName: string | null;
}

export interface DeletedRecordsPagedVm {
    readonly items: DeletedRecordRowVm[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
}

export interface DeletedRecordsQuery {
    readonly page: number;
    readonly pageSize: number;
    readonly search?: string;
}
