/**
 * GET `/api/v1/lab-results` — liste sorgusu.
 *
 * HttpParams (canonical): `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `Status`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order`.
 * `fromDate` / `toDate` (**yyyy-MM-dd**) istekte İstanbul günü başı / sonu UTC olarak `dateFromUtc` / `dateToUtc` gider (istem zamanı).
 */
import type { LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';


export interface LabResultsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    /** yyyy-MM-dd; istekte İstanbul günü başı UTC `dateFromUtc`. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte İstanbul günü sonu UTC `dateToUtc`. */
    toDate?: string;
    sort?: string;
    order?: string;
    /** Boşsa iptaller gizli (backend varsayılanı). */
    status?: LabResultStatus;
}
