import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ClinicTaxpayerSettingsDto,
    UpdateClinicTaxpayerSettingsRequestDto
} from '@/app/features/clinics/models/clinic-taxpayer-settings.model';

/** Klinik mükellef ayarları (ADR-036 Dilim 1). HTTP hataları bileşende ayrıştırılsın diye ham iletilir. */
@Injectable({ providedIn: 'root' })
export class ClinicTaxpayerSettingsService {
    private readonly api = inject(ApiClient);

    /** `Clinics.Read`; kayıt yoksa varsayılan (`isConfigured: false`, KDV %20). */
    get(clinicId: string): Observable<ClinicTaxpayerSettingsDto> {
        return this.api.get<ClinicTaxpayerSettingsDto>(ApiEndpoints.clinics.taxpayerSettings(clinicId));
    }

    /** `Clinics.Update`; tam değiştirme. */
    update(clinicId: string, body: UpdateClinicTaxpayerSettingsRequestDto): Observable<ClinicTaxpayerSettingsDto> {
        return this.api.put<ClinicTaxpayerSettingsDto>(ApiEndpoints.clinics.taxpayerSettings(clinicId), body);
    }
}
