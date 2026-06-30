import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { AccountSummary } from '@/app/features/account/models/account-summary.model';

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
    private readonly api = inject(ApiClient);

    getAccountSummary(): Observable<AccountSummary> {
        return this.api.get<AccountSummary>(ApiEndpoints.me.accountSummary());
    }

    changePassword(request: ChangePasswordRequest): Observable<void> {
        const body: ChangePasswordRequest = {
            currentPassword: request.currentPassword.trim(),
            newPassword: request.newPassword.trim(),
            confirmPassword: request.confirmPassword.trim()
        };
        return this.api.post<unknown>(ApiEndpoints.me.changePassword(), body).pipe(map(() => undefined));
    }
}
