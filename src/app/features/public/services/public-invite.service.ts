import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapPublicInviteDetailsDtoToVm } from '@/app/features/public/data/public-invite.mapper';
import type { PublicInviteDetailsDto, PublicInviteSignupAndAcceptRequestDto } from '@/app/features/public/models/public-invite-api.model';
import type { PublicInviteVm } from '@/app/features/public/models/public-invite-vm.model';

@Injectable({ providedIn: 'root' })
export class PublicInviteService {
    private readonly api = inject(ApiClient);

    getInviteByToken(token: string): Observable<PublicInviteVm> {
        const t = token?.trim() ?? '';
        if (!t) {
            return throwError(() => new Error('Davet bağlantısı eksik.'));
        }
        return this.api.get<PublicInviteDetailsDto>(ApiEndpoints.public.inviteByToken(t)).pipe(
            map((dto) => {
                const vm = mapPublicInviteDetailsDtoToVm(dto, t);
                if (!vm) {
                    throw new Error('Davet bilgisi okunamadı.');
                }
                return vm;
            })
        );
    }

    acceptInvite(token: string): Observable<void> {
        const t = token?.trim() ?? '';
        if (!t) {
            return throwError(() => new Error('Davet bağlantısı eksik.'));
        }
        return this.api.post<unknown>(ApiEndpoints.public.inviteAccept(t), {}).pipe(map(() => void 0));
    }

    signupAndAccept(token: string, body: PublicInviteSignupAndAcceptRequestDto): Observable<void> {
        const t = token?.trim() ?? '';
        if (!t) {
            return throwError(() => new Error('Davet bağlantısı eksik.'));
        }
        return this.api.post<unknown>(ApiEndpoints.public.inviteSignupAndAccept(t), body).pipe(map(() => void 0));
    }
}
