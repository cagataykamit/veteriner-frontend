import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';

interface PasswordResetOkResponse {
    ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
    private readonly api = inject(ApiClient);

    requestReset(email: string): Observable<void> {
        return this.api
            .post<PasswordResetOkResponse>(ApiEndpoints.password.requestReset(), { email: email.trim() })
            .pipe(map(() => undefined));
    }

    confirmReset(token: string, newPassword: string): Observable<void> {
        return this.api
            .post<PasswordResetOkResponse>(ApiEndpoints.password.confirmReset(), {
                token: token.trim(),
                newPassword: newPassword.trim()
            })
            .pipe(map(() => undefined));
    }
}
