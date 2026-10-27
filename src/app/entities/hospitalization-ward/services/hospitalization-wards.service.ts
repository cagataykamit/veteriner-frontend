import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapHospitalizationLocationFormToApiBody,
    mapHospitalizationRoomDtoToVm,
    mapHospitalizationWardDtoToVm,
    mapHospitalizationWardsDtoToVm
} from '@/app/entities/hospitalization-ward/data/hospitalization-ward.mapper';
import type {
    HospitalizationLocationWriteRequestDto,
    HospitalizationRoomDto,
    HospitalizationWardDto
} from '@/app/entities/hospitalization-ward/models/hospitalization-ward-api.model';
import type {
    HospitalizationLocationFormValue,
    HospitalizationRoomVm,
    HospitalizationWardVm
} from '@/app/entities/hospitalization-ward/models/hospitalization-ward-vm.model';
import { toHospitalizationWardError } from '@/app/entities/hospitalization-ward/utils/hospitalization-ward-error.utils';

/**
 * Klinik tanımlı yatış bölümleri ve odaları (HOSP-002, sözleşme §10): Tanımlar ekranı ve yatış formu seçicisi buradan okur.
 * Hatalar `HospitalizationWardError` olarak iletilir.
 */
@Injectable({ providedIn: 'root' })
export class HospitalizationWardsService {
    private readonly api = inject(ApiClient);

    /** Aktif/pasif tüm bölümler odalarıyla; yatış formu `isActive` ile süzer. */
    listWards(clinicId: string): Observable<HospitalizationWardVm[]> {
        return this.api
            .get<HospitalizationWardDto[]>(ApiEndpoints.hospitalizationWards.list(clinicId))
            .pipe(map(mapHospitalizationWardsDtoToVm), toHospitalizationWardError('Yatış konumları yüklenemedi.'));
    }

    createWard(clinicId: string, value: HospitalizationLocationFormValue): Observable<string> {
        return this.write(value, (body) =>
            this.api.post<string>(ApiEndpoints.hospitalizationWards.list(clinicId), body).pipe(
                map((id) => String(id)),
                toHospitalizationWardError('Bölüm eklenemedi.')
            )
        );
    }

    updateWard(clinicId: string, wardId: string, value: HospitalizationLocationFormValue): Observable<HospitalizationWardVm> {
        return this.write(value, (body) =>
            this.api.put<HospitalizationWardDto>(ApiEndpoints.hospitalizationWards.byId(clinicId, wardId), body).pipe(
                map(mapHospitalizationWardDtoToVm),
                toHospitalizationWardError('Bölüm güncellenemedi.')
            )
        );
    }

    setWardActive(clinicId: string, wardId: string, active: boolean): Observable<HospitalizationWardVm> {
        const path = active ? ApiEndpoints.hospitalizationWards.activate(clinicId, wardId) : ApiEndpoints.hospitalizationWards.deactivate(clinicId, wardId);

        return this.api.post<HospitalizationWardDto>(path, {}).pipe(
            map(mapHospitalizationWardDtoToVm),
            toHospitalizationWardError(active ? 'Bölüm etkinleştirilemedi.' : 'Bölüm pasife alınamadı.')
        );
    }

    createRoom(clinicId: string, wardId: string, value: HospitalizationLocationFormValue): Observable<string> {
        return this.write(value, (body) =>
            this.api.post<string>(ApiEndpoints.hospitalizationWards.rooms(clinicId, wardId), body).pipe(
                map((id) => String(id)),
                toHospitalizationWardError('Oda eklenemedi.')
            )
        );
    }

    updateRoom(clinicId: string, wardId: string, roomId: string, value: HospitalizationLocationFormValue): Observable<HospitalizationRoomVm> {
        return this.write(value, (body) =>
            this.api.put<HospitalizationRoomDto>(ApiEndpoints.hospitalizationWards.roomById(clinicId, wardId, roomId), body).pipe(
                map((dto) => mapHospitalizationRoomDtoToVm(dto, wardId)),
                toHospitalizationWardError('Oda güncellenemedi.')
            )
        );
    }

    setRoomActive(clinicId: string, wardId: string, roomId: string, active: boolean): Observable<HospitalizationRoomVm> {
        const path = active
            ? ApiEndpoints.hospitalizationWards.roomActivate(clinicId, wardId, roomId)
            : ApiEndpoints.hospitalizationWards.roomDeactivate(clinicId, wardId, roomId);

        return this.api.post<HospitalizationRoomDto>(path, {}).pipe(
            map((dto) => mapHospitalizationRoomDtoToVm(dto, wardId)),
            toHospitalizationWardError(active ? 'Oda etkinleştirilemedi.' : 'Oda pasife alınamadı.')
        );
    }

    /** Gövde mapper'da kurulur; boş ad istek atılmadan hataya düşer. */
    private write<T>(value: HospitalizationLocationFormValue, send: (body: HospitalizationLocationWriteRequestDto) => Observable<T>): Observable<T> {
        try {
            return send(mapHospitalizationLocationFormToApiBody(value));
        } catch {
            return throwError(() => new Error('Ad zorunludur.'));
        }
    }
}
