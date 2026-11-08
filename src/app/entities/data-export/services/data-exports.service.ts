import type { HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { DataExportJobDto, DataExportOverviewDto } from '@/app/entities/data-export/models/data-export.model';

/** Tüm veri dışa aktarma (`DATA_EXPORT_API_CONTRACT.md` §4); kiracı oturumdan gelir, indirme yalnız kimlikli istekle. */
@Injectable({ providedIn: 'root' })
export class DataExportsService {
    private readonly api = inject(ApiClient);

    overview(): Observable<DataExportOverviewDto> {
        return this.api.get<DataExportOverviewDto>(ApiEndpoints.dataExports.list());
    }

    /** 202 ve kuyruktaki iş; açık iş varsa ya da sınır doluysa 409. */
    request(): Observable<DataExportJobDto> {
        return this.api.post<DataExportJobDto>(ApiEndpoints.dataExports.list(), null);
    }

    download(id: string): Observable<HttpResponse<Blob>> {
        return this.api.getBlob(ApiEndpoints.dataExports.download(id));
    }
}
