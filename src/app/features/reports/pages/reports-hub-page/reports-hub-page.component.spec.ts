import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_READ_CLAIM, PAYMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ReportPreferencesService } from '@/app/features/reports/shared/report-preferences.service';
import { ReportsHubPageComponent } from './reports-hub-page.component';

describe('ReportsHubPageComponent — favoriler (REPORT-003)', () => {
    let preferences: MockedObject<ReportPreferencesService>;
    let claims: Set<string>;

    function render(favoriteKeys: string[]) {
        preferences.listFavoriteKeys.mockReturnValue(of(favoriteKeys));
        const fixture = TestBed.createComponent(ReportsHubPageComponent);

        fixture.detectChanges();

        return fixture;
    }

    function favoriteLabels(el: HTMLElement): (string | undefined)[] {
        if (!el.querySelector('[data-testid="favorites-section"]')) {
            return [];
        }

        const grid = el.querySelectorAll('app-navigation-cards')[0];

        return Array.from(grid.querySelectorAll('.font-medium')).map((n) => n.textContent?.trim());
    }

    function starFor(el: HTMLElement, label: string): HTMLButtonElement {
        return Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="favorite-toggle"]')).find((b) => b.getAttribute('aria-label')?.endsWith(label))!;
    }

    beforeEach(() => {
        claims = new Set([PAYMENTS_READ_CLAIM, APPOINTMENTS_READ_CLAIM]);
        preferences = {
            listFavoriteKeys: vi.fn().mockName('listFavoriteKeys'),
            addFavorite: vi.fn().mockName('addFavorite'),
            removeFavorite: vi.fn().mockName('removeFavorite')
        } as unknown as MockedObject<ReportPreferencesService>;
        preferences.addFavorite.mockReturnValue(of(undefined));
        preferences.removeFavorite.mockReturnValue(of(undefined));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ReportPreferencesService, useValue: preferences },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }
            ]
        });
    });

    it('favoriler en üstte, eklenme sırasıyla; izni olmayan rapor favoride olsa da görünmez', () => {
        const el: HTMLElement = render(['payments', 'registers.vaccines', 'appointments']).nativeElement;

        expect(favoriteLabels(el)).toEqual(['Ödeme Raporu', 'Randevu Raporu']);
        expect(starFor(el, 'Ödeme Raporu').getAttribute('aria-pressed')).toBe('true');
    });

    it('favori yoksa bölüm görünmez; yıldız favoriye ekler ve bölüme taşır', () => {
        const fixture = render([]);
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('[data-testid="favorites-section"]')).toBeNull();
        expect(starFor(el, 'Randevu Raporu').getAttribute('aria-pressed')).toBe('false');

        starFor(el, 'Randevu Raporu').click();
        fixture.detectChanges();

        expect(preferences.addFavorite).toHaveBeenCalledWith('appointments');
        expect(favoriteLabels(el)).toEqual(['Randevu Raporu']);
    });

    it('favoriden çıkarma başarısızsa önceki duruma döner ve uyarı gösterir', () => {
        preferences.removeFavorite.mockReturnValue(throwError(() => new Error('ağ')));
        const fixture = render(['payments']);

        fixture.componentInstance.toggleFavorite('/panel/reports/payments');
        fixture.detectChanges();

        expect(preferences.removeFavorite).toHaveBeenCalledWith('payments');
        expect(fixture.componentInstance.favoriteKeys()).toEqual(['payments']);
        expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Favori kaydedilemedi');
    });

    it('favoriler yüklenemezse merkez yine raporları listeler', () => {
        preferences.listFavoriteKeys.mockReturnValue(throwError(() => new Error('500')));
        const fixture = TestBed.createComponent(ReportsHubPageComponent);

        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ödeme Raporu');
        expect(fixture.componentInstance.favoriteKeys()).toEqual([]);
    });
});
