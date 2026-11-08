import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    CreateWaitlistEntryBody,
    WaitlistEntryDetailDto,
    WaitlistEntryDto,
    WaitlistListQuery,
    WaitlistOfferDto,
    WaitlistSlotDto,
    WaitlistTodayDto
} from '@/app/entities/waitlist/models/waitlist.model';

/** Bekleme listesi, panel (TIER-018; Veteriner `docs/WAITLIST_API_CONTRACT.md` §2). Paket ve klinik kuralı backend'dedir. */
@Injectable({ providedIn: 'root' })
export class WaitlistService {
    private readonly api = inject(ApiClient);

    list(query: WaitlistListQuery = {}): Observable<WaitlistEntryDto[]> {
        let params = new HttpParams();

        if (query.clinicId) {
            params = params.set('clinicId', query.clinicId);
        }

        if (query.veterinarianUserId) {
            params = params.set('veterinarianUserId', query.veterinarianUserId);
        }

        if (query.status) {
            params = params.set('status', query.status);
        }

        return this.api.get<WaitlistEntryDto[]>(ApiEndpoints.waitlistEntries.list(), params);
    }

    detail(id: string): Observable<WaitlistEntryDetailDto> {
        return this.api.get<WaitlistEntryDetailDto>(ApiEndpoints.waitlistEntries.detail(id));
    }

    create(body: CreateWaitlistEntryBody): Observable<WaitlistEntryDto> {
        return this.api.post<WaitlistEntryDto>(ApiEndpoints.waitlistEntries.list(), body);
    }

    close(id: string, reason: string | null): Observable<WaitlistEntryDto> {
        return this.api.post<WaitlistEntryDto>(ApiEndpoints.waitlistEntries.close(id), { reason });
    }

    move(id: string, direction: 'Up' | 'Down'): Observable<WaitlistEntryDto> {
        return this.api.post<WaitlistEntryDto>(ApiEndpoints.waitlistEntries.move(id), { direction });
    }

    sendOffer(id: string, sourceAppointmentId: string): Observable<WaitlistOfferDto> {
        return this.api.post<WaitlistOfferDto>(ApiEndpoints.waitlistEntries.offers(id), { sourceAppointmentId });
    }

    slot(appointmentId: string): Observable<WaitlistSlotDto> {
        return this.api.get<WaitlistSlotDto>(ApiEndpoints.waitlistEntries.slot(appointmentId));
    }

    today(clinicId: string): Observable<WaitlistTodayDto> {
        return this.api.get<WaitlistTodayDto>(ApiEndpoints.waitlistEntries.today(), new HttpParams().set('clinicId', clinicId));
    }
}
