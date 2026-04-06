import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapSubscriptionSummaryDtoToVm } from '@/app/features/subscriptions/data/subscription.mapper';
import type { SubscriptionSummaryDto } from '@/app/features/subscriptions/models/subscription-api.model';
import type { SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getSubscriptionSummary(): Observable<SubscriptionSummaryVm> {
        const tenantId = this.resolveTenantId();
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.get<SubscriptionSummaryDto>(ApiEndpoints.tenants.subscriptionSummary(tenantId)).pipe(
            map(mapSubscriptionSummaryDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Abonelik özeti yüklenemedi.')))
            )
        );
    }

    private resolveTenantId(): string | null {
        const token = this.auth.getAccessToken();
        if (!token) {
            return null;
        }
        const payload = decodeJwtPayload(token);
        if (!payload) {
            return null;
        }
        const direct = firstString(
            payload['tenant_id'],
            payload['tenantId'],
            payload['TenantId'],
            payload['resolvedTenantId'],
            payload['ResolvedTenantId'],
            payload['tenant']
        );
        if (direct) {
            return direct.trim();
        }
        for (const [key, value] of Object.entries(payload)) {
            if (!key.toLowerCase().includes('tenant')) {
                continue;
            }
            const asText = firstString(value);
            if (asText) {
                return asText.trim();
            }
        }
        return null;
    }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const json = atob(padded);
        const parsed = JSON.parse(json) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function firstString(...values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }
    return null;
}
