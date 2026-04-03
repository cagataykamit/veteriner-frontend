/**
 * GET `/api/v1/lab-results` — liste sorgusu.
 */

export interface LabResultsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}
