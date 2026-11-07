import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { defaultStoredConfig } from '@site-engine';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { SiteBuilderPageComponent } from '@/app/features/clinic-site/builder/site-builder-page.component';
import type { ClinicSiteDetailDto, ClinicSiteStateDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { ClinicSiteService } from '@/app/features/clinic-site/services/clinic-site.service';

const PUBLISHED: ClinicSiteStateDto = {
    siteId: 's1',
    clinicId: 'c1',
    slug: 'cagri-vet',
    publicPath: '/k/cagri-vet',
    isTemporarilyClosed: false,
    publishedVersionNumber: 2,
    publishedAtUtc: '2026-11-07T10:00:00Z',
    hasUnpublishedChanges: true,
    draftUpdatedAtUtc: '2026-11-07T10:00:00Z',
    rowVersion: 'r1'
};

const DETAIL: ClinicSiteDetailDto = { exists: true, suggestedSlug: null, site: PUBLISHED, draft: defaultStoredConfig(), isClosedBySubscription: false, missingForPublish: [], missingImageIds: [], images: [] };

async function open(options: { detail?: ClinicSiteDetailDto; canUpdate?: boolean; readOnly?: boolean; clinics?: number } = {}): Promise<ComponentFixture<SiteBuilderPageComponent>> {
    const list = Array.from({ length: options.clinics ?? 1 }, (_, i) => ({ id: `c${i + 1}`, name: `Klinik ${i + 1}`, city: '', isActive: true, phone: '', email: '' }));

    TestBed.configureTestingModule({
        imports: [SiteBuilderPageComponent],
        providers: [
            provideRouter([]),
            {
                provide: ClinicSiteService,
                useValue: { get: () => of(options.detail ?? DETAIL), versions: () => of([]), imageContent: () => of(new Blob()), checkAddress: () => of({ isAvailable: true }) }
            },
            {
                provide: ClinicsService,
                useValue: {
                    listClinics: () => of(list),
                    getClinicById: () => of({ id: 'c1', name: 'Çağrı', city: 'Ankara', district: '', isActive: true, phone: '03120000000', email: '', address: 'Adres', description: '' }),
                    getWorkingHours: () => of([])
                }
            },
            { provide: OnlineBookingService, useValue: { getSettings: () => of({ isEnabled: false, bookingUrl: null }) } },
            { provide: AuthService, useValue: { hasOperationClaim: () => options.canUpdate ?? true, getClinicId: () => 'c1', getClinicName: () => 'Klinik 1' } },
            { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(options.readOnly ?? false), ensurePanelTenantAccess: () => of(null) } }
        ]
    });

    const fixture = TestBed.createComponent(SiteBuilderPageComponent);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
}

const text = (fixture: ComponentFixture<SiteBuilderPageComponent>): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
const root = (fixture: ComponentFixture<SiteBuilderPageComponent>): HTMLElement => fixture.nativeElement as HTMLElement;

describe('SiteBuilderPageComponent', () => {
    it('panele dönüş bağlantısı ve yedi adım vardır', async () => {
        const fixture = await open();

        expect(root(fixture).querySelector('a.back')?.getAttribute('href')).toBe('/panel/settings');
        expect(root(fixture).querySelectorAll('.stepper button')).toHaveLength(7);
        expect(text(fixture)).toContain('Klinik bilgileri');
    });

    it('"değişiklik var, yayında değil" şeridi görünür, yayın adımına götürür', async () => {
        const fixture = await open();
        const notice = [...root(fixture).querySelectorAll('.notice')].find((item) => item.textContent?.includes('Değişiklik var, yayında değil'));

        expect(notice).toBeTruthy();
        notice?.querySelector('button')?.click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(text(fixture)).toContain('Son kontrol ve yayınlama');
        expect(text(fixture)).toContain('vetinity.com/k/cagri-vet');
    });

    it('abonelik salt okunurken alanlar kapalıdır ve durum söylenir', async () => {
        const fixture = await open({ readOnly: true, detail: { ...DETAIL, isClosedBySubscription: true } });

        expect(text(fixture)).toContain('Abonelik salt okunur');
        expect(text(fixture)).toContain('site ziyaretçilere kapalı');
        expect(root(fixture).querySelector<HTMLFieldSetElement>('fieldset.steps')?.disabled).toBe(true);
    });

    it('güncelleme yetkisi yoksa yalnız görüntülenir', async () => {
        const fixture = await open({ canUpdate: false });

        expect(text(fixture)).toContain('Yalnız görüntüleme');
        expect(root(fixture).querySelector<HTMLFieldSetElement>('fieldset.steps')?.disabled).toBe(true);
    });

    it('geçici kapalı site açıkça gösterilir', async () => {
        const fixture = await open({ detail: { ...DETAIL, site: { ...PUBLISHED, isTemporarilyClosed: true } } });

        expect(text(fixture)).toContain('geçici olarak kapalı');
        expect(root(fixture).querySelector('.draft')?.textContent).toBe('Kapalı');
    });

    it('çok klinikte seçici çıkar, tek klinikte çıkmaz', async () => {
        expect(root(await open({ clinics: 1 })).querySelector('.clinic select')).toBeNull();
        TestBed.resetTestingModule();
        expect(root(await open({ clinics: 2 })).querySelectorAll('.clinic option')).toHaveLength(2);
    });

    it('yayınlanmamış sitede paylaşım gösterilmez, yayınlanmışta gösterilir', async () => {
        const draftOnly = await open({ detail: { ...DETAIL, site: { ...PUBLISHED, publishedVersionNumber: null } } });

        (draftOnly.componentInstance as unknown as { step: { set(value: number): void } }).step.set(6);
        await draftOnly.whenStable();
        draftOnly.detectChanges();
        expect(root(draftOnly).querySelector('app-site-share')).toBeNull();

        TestBed.resetTestingModule();

        const published = await open();

        (published.componentInstance as unknown as { step: { set(value: number): void } }).step.set(6);
        await published.whenStable();
        published.detectChanges();
        expect(root(published).querySelector('app-site-share')).not.toBeNull();
        expect(text(published)).toContain('eski bağlantı çalışır');
    });
});
