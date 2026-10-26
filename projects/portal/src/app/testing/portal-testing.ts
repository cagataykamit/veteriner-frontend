import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PORTAL_API_BASE_URL } from '@portal/app/core/api/portal-api.client';
import { portalAuthInterceptor } from '@portal/app/core/api/portal-auth.interceptor';
import type { PortalAuthTokens, PortalMe } from '@portal/app/core/auth/portal-auth.models';

/** Yalnız spec'ler için ortak yardımcılar. */
export const TEST_PORTAL_BASE = '/api/portal/v1';

export function testTokens(n: number): PortalAuthTokens {
    return {
        accessToken: `access-${n}`,
        accessTokenExpiresAtUtc: '2026-10-16T10:15:00Z',
        refreshToken: `refresh-${n}`,
        refreshTokenExpiresAtUtc: '2026-11-15T10:00:00Z'
    };
}

export const TEST_ME: PortalMe = {
    id: 'acc-1',
    email: 'ayse@example.com',
    displayName: 'Ayşe',
    hasPassword: false,
    links: [{ linkId: 'link-1', clinicId: 'clinic-1', clinicName: 'Merkez', clientFullName: 'Ayşe Yılmaz' }]
};

/** Söz zincirlerinin ilerlemesi için bir makro görev bekler. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

/** Koşul sağlanana dek (en çok ~1 sn) bekler; zaman aşımında testi başarısız eder. */
export async function waitFor(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !condition(); i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }

    if (!condition()) {
        throw new Error('Beklenen koşul sağlanmadı.');
    }
}

/** Yenileme Web Locks ile sıralandığı için istek birkaç görev sonra çıkar; gelene dek bekler (en çok ~1 sn). */
export async function expectOneSoon(backend: HttpTestingController, url: string): Promise<TestRequest> {
    // `match` bulduğunu açık istek listesinden çıkarır; bulunan istek yine yanıtlanabilir.
    for (let i = 0; i < 100; i++) {
        const found = backend.match({ url });

        if (found.length > 1) {
            throw new Error(`${url} için 1 istek beklendi, ${found.length} bulundu.`);
        }

        if (found.length === 1) {
            return found[0];
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`${url} için istek gelmedi.`);
}

export function configurePortalHttp(): void {
    TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(withXhr(), withInterceptors([portalAuthInterceptor])), provideHttpClientTesting(), { provide: PORTAL_API_BASE_URL, useValue: TEST_PORTAL_BASE }]
    });
}

export function problem(status: number, code?: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: code ? { status, extensions: { code } } : null });
}

export function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().includes(text));
}

export function typeInto(root: HTMLElement, selector: string, value: string): void {
    const input = root.querySelector<HTMLInputElement>(selector);

    if (!input) {
        throw new Error(`Alan yok: ${selector}`);
    }

    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
}
