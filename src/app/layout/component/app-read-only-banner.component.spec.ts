import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppReadOnlyBannerComponent } from './app-read-only-banner.component';

describe('AppReadOnlyBannerComponent', () => {
    const create = async (url: string): Promise<ComponentFixture<AppReadOnlyBannerComponent>> => {
        TestBed.configureTestingModule({
            imports: [AppReadOnlyBannerComponent],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                {
                    provide: TenantReadOnlyContextService,
                    useValue: { accessState: signal({ isReadOnly: true, message: null }), showReadOnlyBannerSubscriptionActions: signal(true) }
                }
            ]
        });
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(AppReadOnlyBannerComponent);

        fixture.detectChanges();

        return fixture;
    };

    const subscriptionLinks = (fixture: ComponentFixture<AppReadOnlyBannerComponent>) =>
        (fixture.nativeElement as HTMLElement).querySelectorAll('a[href="/panel/settings/subscription"]').length;

    const navigate = async (fixture: ComponentFixture<AppReadOnlyBannerComponent>, url: string) => {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    };

    it('abonelik sayfası dışında abonelik bağlantılarını gösterir', async () => {
        expect(subscriptionLinks(await create('/panel/dashboard'))).toBe(2);
    });

    it('abonelik sayfasında açılıp başka sayfaya geçince bağlantılar geri gelir', async () => {
        const fixture = await create('/panel/settings/subscription');

        expect(subscriptionLinks(fixture)).toBe(0);
        await navigate(fixture, '/panel/dashboard');
        expect(subscriptionLinks(fixture)).toBe(2);
    });

    it('abonelik sayfasına geçince bağlantılar gizlenir', async () => {
        const fixture = await create('/panel/dashboard');

        await navigate(fixture, '/panel/settings/subscription');
        expect(subscriptionLinks(fixture)).toBe(0);
    });
});
