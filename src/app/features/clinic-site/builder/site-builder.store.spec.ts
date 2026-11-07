import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { defaultStoredConfig, type StoredSiteConfig } from '@site-engine';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { SiteBuilderStore, workingDaysError } from '@/app/features/clinic-site/builder/site-builder.store';
import type { ClinicSiteDetailDto, ClinicSiteStateDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { ClinicSiteService } from '@/app/features/clinic-site/services/clinic-site.service';
import { ClinicSiteError } from '@/app/features/clinic-site/utils/clinic-site-error.utils';

const STATE: ClinicSiteStateDto = {
    siteId: 's1',
    clinicId: 'c1',
    slug: 'cagri-vet',
    publicPath: '/k/cagri-vet',
    isTemporarilyClosed: false,
    publishedVersionNumber: null,
    publishedAtUtc: null,
    hasUnpublishedChanges: false,
    draftUpdatedAtUtc: '2026-11-07T10:00:00Z',
    rowVersion: 'r1'
};

const DETAIL: ClinicSiteDetailDto = { exists: true, suggestedSlug: null, site: STATE, draft: defaultStoredConfig(), isClosedBySubscription: false, missingForPublish: [], missingImageIds: [], images: [] };
const NO_SITE: ClinicSiteDetailDto = { exists: false, suggestedSlug: 'cagri-vet', site: null, draft: null, isClosedBySubscription: false, missingForPublish: ['phone'], missingImageIds: [], images: [] };
const CLINIC = { id: 'c1', name: 'Çağrı', city: 'Ankara', district: 'Çankaya', isActive: true, phone: '03120000000', email: 'a@example.com', address: 'Adres', description: 'Açıklama' };
const HOURS = [{ dayOfWeek: 1, dayLabel: 'Pazartesi', isClosed: false, opensAt: '09:00:00', closesAt: '18:00:00', breakStartsAt: null, breakEndsAt: null }];

function setup(options: { detail?: ClinicSiteDetailDto; canUpdate?: boolean; readOnly?: boolean } = {}) {
    const api = {
        get: vi.fn(() => of(options.detail ?? DETAIL)),
        saveDraft: vi.fn((_clinicId: string, _config: StoredSiteConfig, rowVersion: string | null) => of({ ...STATE, rowVersion: `${rowVersion ?? 'yeni'}+` })),
        versions: vi.fn(() => of([])),
        publish: vi.fn(() => of({ ...STATE, publishedVersionNumber: 1 })),
        close: vi.fn(() => of({ ...STATE, isTemporarilyClosed: true })),
        reopen: vi.fn(() => of(STATE)),
        changeAddress: vi.fn((_clinicId: string, slug: string) => of({ ...STATE, slug })),
        restoreVersion: vi.fn(() => of(STATE)),
        imageContent: vi.fn(() => of(new Blob(['x']))),
        uploadImage: vi.fn(),
        deleteImage: vi.fn(() => of(undefined))
    };
    const clinics = {
        listClinics: vi.fn(() => of([])),
        getClinicById: vi.fn(() => of(CLINIC)),
        getWorkingHours: vi.fn(() => of(HOURS)),
        updateClinicFromForm: vi.fn(() => of(CLINIC)),
        updateWorkingHours: vi.fn(() => of(HOURS))
    };

    TestBed.configureTestingModule({
        providers: [
            SiteBuilderStore,
            { provide: ClinicSiteService, useValue: api },
            { provide: ClinicsService, useValue: clinics },
            { provide: OnlineBookingService, useValue: { getSettings: () => of({ isEnabled: true, bookingUrl: 'https://portal.example.com/randevu/kod' }) } },
            { provide: AuthService, useValue: { hasOperationClaim: () => options.canUpdate ?? true, getClinicId: () => 'c1', getClinicName: () => 'Çağrı' } },
            { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(options.readOnly ?? false) } }
        ]
    });

    const store = TestBed.inject(SiteBuilderStore);

    store.clinicId.set('c1');
    store.reload();

    return { store, api, clinics };
}

const conflict = () => new ClinicSiteError('Değiştirildi.', 'ClinicSites.ConcurrencyConflict');

describe('SiteBuilderStore', () => {
    afterEach(() => vi.useRealTimers());

    it('klinik kaydını, adresi ve randevu bağlantısını yapılandırmaya birleştirir; saklanan taslağa koymaz (K8, K11)', () => {
        const { store } = setup();
        const { clinic } = store.config().content;

        expect(clinic.name).toBe('Çağrı');
        expect(clinic.workingDays[0].opensAt).toBe('09:00');
        expect(clinic.bookingUrl).toContain('/randevu/');
        expect(store.config().seo.slug).toBe('cagri-vet');
        expect(store.stored().content.clinic).not.toHaveProperty('name');
        expect(store.stored().content.clinic).not.toHaveProperty('bookingUrl');
        expect(store.stored().seo).not.toHaveProperty('slug');
    });

    it('sayfayı açmak site oluşturmaz; ilk kayıt sürüm numarasız gider', async () => {
        const { store, api } = setup({ detail: NO_SITE });

        expect(store.slug()).toBe('cagri-vet');
        expect(api.saveDraft).not.toHaveBeenCalled();

        store.patchClinic({ slogan: 'Yeni' });
        await store.flush();

        expect(api.saveDraft).toHaveBeenCalledWith('c1', expect.objectContaining({ schemaVersion: 1 }), null);
        expect(store.site()?.rowVersion).toBe('yeni+');
    });

    it('otomatik kayıt gecikmelidir, art arda yazım tek istek olur, yanıttaki sürüm sonrakinde kullanılır', async () => {
        vi.useFakeTimers();

        const { store, api } = setup();

        store.patchClinic({ slogan: 'a' }, 'slogan');
        store.patchClinic({ slogan: 'ab' }, 'slogan');
        expect(store.saveState()).toBe('pending');
        expect(api.saveDraft).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1300);

        expect(api.saveDraft).toHaveBeenCalledTimes(1);
        expect(api.saveDraft.mock.calls[0][1].content.clinic.slogan).toBe('ab');
        expect(store.saveState()).toBe('saved');

        store.patchClinic({ slogan: 'abc' }, 'slogan');
        await store.flush();

        expect(api.saveDraft.mock.calls[1][2]).toBe('r1+');
    });

    it('geri al ve yinele taslağı döndürür; hızlı yazım tek adımdır', async () => {
        vi.useFakeTimers();

        const { store } = setup();

        store.patchClinic({ slogan: 'a' }, 'slogan');
        store.patchClinic({ slogan: 'ab' }, 'slogan');
        store.undo();
        expect(store.stored().content.clinic.slogan).toBe('');
        expect(store.canUndo()).toBe(false);

        store.redo();
        expect(store.stored().content.clinic.slogan).toBe('ab');
    });

    it('çakışmada otomatik kayıt durur, anlaşılır uyarı verir; kullanıcı benimkini derse güncel sürümle yazar', async () => {
        const { store, api } = setup();

        api.saveDraft.mockImplementationOnce(() => throwError(conflict));
        store.patchClinic({ slogan: 'a' });
        await store.flush();

        expect(store.saveState()).toBe('conflict');
        expect(store.saveError()).toContain('Değiştirildi');

        store.patchClinic({ slogan: 'ab' });
        expect(store.saveState()).toBe('conflict');

        api.get.mockReturnValueOnce(of({ ...DETAIL, site: { ...STATE, rowVersion: 'r9' } }));
        await store.overwriteServerDraft();

        expect(api.saveDraft.mock.calls.at(-1)?.[2]).toBe('r9');
        expect(store.saveState()).toBe('saved');
    });

    it('çakışmada güncel taslağı almak yereldeki değişikliği bırakır', async () => {
        const { store, api } = setup();

        api.saveDraft.mockImplementationOnce(() => throwError(conflict));
        store.patchClinic({ slogan: 'yerel' });
        await store.flush();
        store.takeServerDraft();

        expect(store.stored().content.clinic.slogan).toBe('');
        expect(store.saveState()).toBe('idle');
    });

    it('yetki ya da abonelik yoksa yazmaz, otomatik kayıt da başlamaz', async () => {
        for (const options of [{ canUpdate: false }, { readOnly: true }]) {
            TestBed.resetTestingModule();

            const { store, api } = setup(options);

            expect(store.canWrite()).toBe(false);
            store.patchClinic({ slogan: 'a' });
            store.setRecord({ name: 'Başka' });
            expect(store.stored().content.clinic.slogan).toBe('');
            expect(store.record().name).toBe('Çağrı');
            await store.flush();
            expect(api.saveDraft).not.toHaveBeenCalled();
        }
    });

    it('yayın önce bekleyen taslağı yazar, kaydedilen sürümle yayınlar', async () => {
        const { store, api } = setup();

        store.patchClinic({ slogan: 'a' });
        api.get.mockReturnValue(of({ ...DETAIL, site: { ...STATE, publishedVersionNumber: 1 } }));

        expect(await store.publish()).toBe(true);
        expect(api.saveDraft).toHaveBeenCalled();
        expect(api.publish).toHaveBeenCalledWith('c1', 'r1+');
        expect(store.isPublished()).toBe(true);
    });

    it('yayın zorunlu liste yüzünden reddedilirse eksikler gösterilir', async () => {
        const { store, api } = setup();

        api.publish.mockReturnValueOnce(throwError(() => new ClinicSiteError('Telefon eksik.', 'ClinicSites.PublishRequirementsNotMet', ['phone'], ['g1'])));

        expect(await store.publish()).toBe(false);
        expect(store.missingForPublish()).toEqual(['phone']);
        expect(store.missingImageIds()).toEqual(['g1']);
        expect(store.actionError()).toBe('Telefon eksik.');
    });

    it('sürüme dönüş taslağı değiştirir, yayını değiştirmez; geri al eski taslağa döner', async () => {
        const { store, api } = setup();

        store.patchClinic({ slogan: 'güncel' });
        await store.flush();

        const restored = { ...defaultStoredConfig('nature') };

        api.get.mockReturnValueOnce(of({ ...DETAIL, draft: restored }));

        expect(await store.restoreVersion(1)).toBe(true);
        expect(store.stored().design.conceptKey).toBe('nature');
        expect(store.isDraftDirty()).toBe(false);

        store.undo();
        expect(store.stored().content.clinic.slogan).toBe('güncel');
    });

    it('klinik kaydı yalnız değişen uçla yazılır (K8)', async () => {
        const { store, clinics } = setup();

        store.setRecord({ phone: '03121111111' });
        expect(store.recordDirty()).toBe(true);
        expect(await store.saveRecord()).toBe(true);
        expect(clinics.updateClinicFromForm).toHaveBeenCalledWith('c1', expect.objectContaining({ phone: '03121111111', description: 'Açıklama' }));
        expect(clinics.updateWorkingHours).not.toHaveBeenCalled();
        expect(store.recordDirty()).toBe(false);
    });

    it('saat kaydı olmayan klinikte ekrandaki saatler yazılmayı bekler, yedi gün gider', async () => {
        const { store, clinics, api } = setup({ detail: { ...DETAIL, missingForPublish: ['workingHours'] } });

        expect(store.recordDirty()).toBe(true);
        api.get.mockReturnValue(of(DETAIL));
        await store.saveRecord();

        const items = (clinics.updateWorkingHours.mock.calls as unknown as [string, { items: unknown[] }][])[0][1].items;

        expect(items).toHaveLength(7);
        expect(store.missingForPublish()).toEqual([]);
    });

    it('geçersiz saat yazılmadan söylenir', () => {
        expect(workingDaysError([{ dayOfWeek: 1, isClosed: false, opensAt: '18:00', closesAt: '09:00', breakStartsAt: null, breakEndsAt: null }])).toContain('açılış');
        expect(workingDaysError([{ dayOfWeek: 1, isClosed: false, opensAt: '09:00', closesAt: '18:00', breakStartsAt: '08:00', breakEndsAt: '10:00' }])).toContain('mola');
        expect(workingDaysError([{ dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null }])).toBeNull();
    });

    it('kullanılan görsel silinirken kullanım yeri söylenir', async () => {
        const { store, api } = setup();

        api.deleteImage.mockReturnValueOnce(throwError(() => new ClinicSiteError('Kullanılıyor.', 'ClinicSites.ImageInUse', [], [], ['draft', 'published'])));
        await store.deleteImage('g1');

        expect(store.actionError()).toContain('taslakta ve yayındaki sürümde');
    });

    it('adres değişince site yoksa önce oluşturur', async () => {
        const { store, api } = setup({ detail: NO_SITE });

        expect(await store.changeAddress('yeni-adres')).toBe(true);
        expect(api.saveDraft).toHaveBeenCalled();
        expect(store.slug()).toBe('yeni-adres');
    });

    it('klinik değişince taslak ve geçmiş yeniden yüklenir, bekleyen kayıt önce yazılır', async () => {
        const { store, api } = setup();

        store.patchClinic({ slogan: 'a' });
        await store.selectClinic('c2');

        expect(api.saveDraft).toHaveBeenCalledWith('c1', expect.anything(), 'r1');
        expect(api.get).toHaveBeenLastCalledWith('c2');
        expect(store.canUndo()).toBe(false);
    });
});
