import { HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { CashMovementCategoryDto, CashMovementDto, CashMovementPageDto, CashRegisterDto, CashRegisterReportDto, CreateCashMovementBody, CreateCashTransferBody } from '@/app/entities/cash-register/models/cash-register.model';

/** Çoklu kasa uçları (TIER-008, `CASH_REGISTERS_API_CONTRACT.md`). Klinik her çağrıda açıkça gönderilir. */
@Injectable({ providedIn: 'root' })
export class CashRegistersService {
    private readonly api = inject(ApiClient);

    list(clinicId: string, includeInactive = false): Observable<CashRegisterDto[]> {
        return this.api.get<CashRegisterDto[]>(ApiEndpoints.cashRegisters.list(), new HttpParams().set('clinicId', clinicId).set('includeInactive', String(includeInactive)));
    }

    create(clinicId: string, code: string, name: string): Observable<CashRegisterDto> {
        return this.api.post<CashRegisterDto>(ApiEndpoints.cashRegisters.list(), { clinicId, code, name });
    }

    update(id: string, code: string, name: string, isActive: boolean): Observable<CashRegisterDto> {
        return this.api.put<CashRegisterDto>(ApiEndpoints.cashRegisters.byId(id), { code, name, isActive });
    }

    report(from: string, to: string, clinicId: string, cashRegisterId: string | null): Observable<CashRegisterReportDto> {
        return this.api.get<CashRegisterReportDto>(ApiEndpoints.cashRegisters.report(), reportParams(from, to, clinicId, cashRegisterId));
    }

    exportReport(format: 'csv' | 'xlsx', from: string, to: string, clinicId: string, cashRegisterId: string | null): Observable<HttpResponse<Blob>> {
        const path = format === 'csv' ? ApiEndpoints.cashRegisters.reportExport() : ApiEndpoints.cashRegisters.reportExportXlsx();

        return this.api.getBlob(path, reportParams(from, to, clinicId, cashRegisterId));
    }

    listCategories(includeInactive = false): Observable<CashMovementCategoryDto[]> {
        return this.api.get<CashMovementCategoryDto[]>(ApiEndpoints.cashMovements.categories(), new HttpParams().set('includeInactive', String(includeInactive)));
    }

    createCategory(name: string): Observable<CashMovementCategoryDto> {
        return this.api.post<CashMovementCategoryDto>(ApiEndpoints.cashMovements.categories(), { name });
    }

    updateCategory(id: string, name: string, isActive: boolean): Observable<CashMovementCategoryDto> {
        return this.api.put<CashMovementCategoryDto>(ApiEndpoints.cashMovements.categoryById(id), { name, isActive });
    }

    listMovements(from: string, to: string, clinicId: string, cashRegisterId: string | null, includeVoided: boolean, pageSize = 100): Observable<CashMovementPageDto> {
        let params = new HttpParams().set('from', from).set('to', to).set('clinicId', clinicId).set('includeVoided', String(includeVoided)).set('page', '1').set('pageSize', String(pageSize));

        if (cashRegisterId) {
            params = params.set('cashRegisterId', cashRegisterId);
        }

        return this.api.get<CashMovementPageDto>(ApiEndpoints.cashMovements.list(), params);
    }

    createMovement(body: CreateCashMovementBody): Observable<CashMovementDto> {
        return this.api.post<CashMovementDto>(ApiEndpoints.cashMovements.list(), body);
    }

    createTransfer(body: CreateCashTransferBody): Observable<CashMovementDto> {
        return this.api.post<CashMovementDto>(ApiEndpoints.cashMovements.transfers(), body);
    }

    /** Aktarımın bir bacağı verilirse iki bacak birlikte iptal edilir. */
    voidMovement(id: string, reason: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.cashMovements.void(id), { reason });
    }
}

function reportParams(from: string, to: string, clinicId: string, cashRegisterId: string | null): HttpParams {
    const params = new HttpParams().set('from', from).set('to', to).set('clinicId', clinicId);

    return cashRegisterId ? params.set('cashRegisterId', cashRegisterId) : params;
}
