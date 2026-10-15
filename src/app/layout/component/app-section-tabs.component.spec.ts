import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppSectionTabsComponent } from './app-section-tabs.component';

describe('AppSectionTabsComponent', () => {
    let claims: (claim: string) => boolean;
    let counts: Record<string, number | null>;

    const create = async (url: string): Promise<ComponentFixture<AppSectionTabsComponent>> => {
        TestBed.configureTestingModule({
            imports: [AppSectionTabsComponent],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: AuthService, useValue: { hasOperationClaim: (claim: string) => claims(claim) } },
                { provide: MenuBadgeService, useValue: { count: (key: string) => counts[key] ?? null } }
            ]
        });
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(AppSectionTabsComponent);

        fixture.detectChanges();

        return fixture;
    };

    const tabs = (fixture: ComponentFixture<AppSectionTabsComponent>) =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'));

    beforeEach(() => {
        claims = () => true;
        counts = {};
    });

    it('liste adresinde sekmeleri gösterir ve etkin sekmeyi işaretler', async () => {
        const fixture = await create('/panel/appointments/calendar');

        expect(tabs(fixture).map((a) => a.getAttribute('href'))).toEqual(['/panel/appointments', '/panel/appointments/calendar']);
        expect(tabs(fixture).map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
    });

    it('detay sayfasında ve tek sekme yetkiliyken çubuk çıkmaz', async () => {
        expect(tabs(await create('/panel/pets/abc'))).toEqual([]);
        TestBed.resetTestingModule();
        claims = (claim) => claim === 'StockMovements.Read';
        expect(tabs(await create('/panel/stock-movements'))).toEqual([]);
    });

    it('Lab sekmesi bekleyen sayıyı gösterir', async () => {
        counts = { requestedLabResults: 4 };
        const fixture = await create('/panel/examinations');
        const lab = tabs(fixture).find((a) => a.textContent?.includes('Lab sonuçları'));

        expect(lab?.textContent).toContain('(4');
        expect(tabs(fixture).filter((a) => a.textContent?.includes('('))).toHaveSize(1);
    });
});
