import { HttpEventType, HttpParams, type HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, type Observable, tap } from 'rxjs';
import type { StoredSiteConfig } from '@site-engine';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ClinicSiteAddressAvailabilityDto, ClinicSiteDetailDto, ClinicSiteImageDto, ClinicSiteStateDto, ClinicSiteVersionDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { toClinicSiteError } from '@/app/features/clinic-site/utils/clinic-site-error.utils';

/** Site yönetim uçları (sözleşme §2): yalnız HTTP ve hata çevirisi; durum `SiteBuilderStore`'dadır. */
@Injectable({ providedIn: 'root' })
export class ClinicSiteService {
    private readonly api = inject(ApiClient);

    get(clinicId: string): Observable<ClinicSiteDetailDto> {
        return this.api.get<ClinicSiteDetailDto>(ApiEndpoints.clinicSite.root(clinicId)).pipe(toClinicSiteError('Site bilgileri yüklenemedi.'));
    }

    saveDraft(clinicId: string, config: StoredSiteConfig, rowVersion: string | null): Observable<ClinicSiteStateDto> {
        return this.api.put<ClinicSiteStateDto>(ApiEndpoints.clinicSite.draft(clinicId), { config, rowVersion }).pipe(toClinicSiteError('Taslak kaydedilemedi.'));
    }

    checkAddress(clinicId: string, slug: string): Observable<ClinicSiteAddressAvailabilityDto> {
        return this.api
            .get<ClinicSiteAddressAvailabilityDto>(ApiEndpoints.clinicSite.addressAvailability(clinicId), new HttpParams().set('slug', slug))
            .pipe(toClinicSiteError('Adres denetlenemedi.'));
    }

    changeAddress(clinicId: string, slug: string): Observable<ClinicSiteStateDto> {
        return this.api.put<ClinicSiteStateDto>(ApiEndpoints.clinicSite.address(clinicId), { slug }).pipe(toClinicSiteError('Adres değiştirilemedi.'));
    }

    publish(clinicId: string, rowVersion: string): Observable<ClinicSiteStateDto> {
        return this.api.post<ClinicSiteStateDto>(ApiEndpoints.clinicSite.publish(clinicId), { rowVersion }).pipe(toClinicSiteError('Yayınlanamadı.'));
    }

    versions(clinicId: string): Observable<readonly ClinicSiteVersionDto[]> {
        return this.api.get<readonly ClinicSiteVersionDto[]>(ApiEndpoints.clinicSite.versions(clinicId)).pipe(toClinicSiteError('Sürümler yüklenemedi.'));
    }

    restoreVersion(clinicId: string, versionNumber: number, rowVersion: string): Observable<ClinicSiteStateDto> {
        return this.api.post<ClinicSiteStateDto>(ApiEndpoints.clinicSite.restoreVersion(clinicId, versionNumber), { rowVersion }).pipe(toClinicSiteError('Sürüm taslağa alınamadı.'));
    }

    close(clinicId: string): Observable<ClinicSiteStateDto> {
        return this.api.post<ClinicSiteStateDto>(ApiEndpoints.clinicSite.close(clinicId), {}).pipe(toClinicSiteError('Site kapatılamadı.'));
    }

    reopen(clinicId: string): Observable<ClinicSiteStateDto> {
        return this.api.post<ClinicSiteStateDto>(ApiEndpoints.clinicSite.reopen(clinicId), {}).pipe(toClinicSiteError('Site açılamadı.'));
    }

    /** `onProgress` yüzde bildirir (0–100). */
    uploadImage(clinicId: string, file: File, onProgress?: (percent: number) => void): Observable<ClinicSiteImageDto> {
        const body = new FormData();

        body.append('file', file, file.name);

        return this.api.upload<ClinicSiteImageDto>(ApiEndpoints.clinicSite.images(clinicId), body).pipe(
            tap((event) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    onProgress?.(Math.round((event.loaded / event.total) * 100));
                }
            }),
            filter((event): event is HttpResponse<ClinicSiteImageDto> => event.type === HttpEventType.Response),
            map((event) => event.body as ClinicSiteImageDto),
            toClinicSiteError('Görsel yüklenemedi.')
        );
    }

    imageContent(clinicId: string, imageId: string): Observable<Blob> {
        return this.api.getBlob(ApiEndpoints.clinicSite.imageContent(clinicId, imageId)).pipe(
            map((response) => response.body as Blob),
            toClinicSiteError('Görsel açılamadı.')
        );
    }

    deleteImage(clinicId: string, imageId: string): Observable<void> {
        return this.api.delete<void>(ApiEndpoints.clinicSite.image(clinicId, imageId)).pipe(toClinicSiteError('Görsel silinemedi.'));
    }
}
