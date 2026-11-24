import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import {
    composeSiteConfig,
    conceptByKey,
    defaultStoredConfig,
    designFromConcept,
    findAlternative,
    readStoredConfig,
    resolveSiteImages,
    type SectionType,
    siteImageId,
    type SiteClinicRecord,
    type SiteContent,
    type SiteDesign,
    type SiteStructure,
    type StoredSiteConfig,
    toWorkingDays,
    usedSiteImageIds,
    type WorkingDay
} from '@site-engine';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { clinicWorkingHourFormRowToWriteItem, clinicWorkingHourDayLabel } from '@/app/entities/clinic/data/clinic-working-hours.mapper';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { dominantColor } from '@/app/features/clinic-site/builder/logo-color';
import { prepareSiteImage } from '@/app/features/clinic-site/builder/image-resize';
import type { ClinicSiteImageDto, ClinicSiteMissing, ClinicSiteStateDto, ClinicSiteVersionDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { ClinicSiteService } from '@/app/features/clinic-site/services/clinic-site.service';
import { ClinicSiteError, clinicSiteErrorMessage } from '@/app/features/clinic-site/utils/clinic-site-error.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { HttpErrorResponse } from '@angular/common/http';

const HISTORY_LIMIT = 60;
/** Aynı alana art arda yazılan harfler geri alımda tek adım sayılır. */
const COALESCE_MS = 700;
const SAVE_DELAY_MS = 1200;

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict';
export type DeviceKey = 'masaustu' | 'tablet' | 'mobil';

/** K8: klinik kaydından okunan ve mevcut klinik uçlarıyla yazılan alanlar. Taslak geçmişine girmez. */
export type ClinicRecordDraft = Pick<SiteClinicRecord, 'name' | 'city' | 'district' | 'address' | 'phone' | 'email' | 'workingDays'>;

const EMPTY_RECORD: ClinicRecordDraft = { name: '', city: '', district: '', address: '', phone: '', email: '', workingDays: [] };

/**
 * Sihirbazın tek store'u: taslak, geri al/yinele, gecikmeli otomatik kayıt ve eşzamanlılık, klinik kaydı (K8), görseller, yayın.
 * Adımlar yalnız buradan okur ve yazar, birbirini tanımaz. Motor bu dosyayı bilmez.
 */
@Injectable()
export class SiteBuilderStore {
    private readonly api = inject(ClinicSiteService);
    private readonly clinics = inject(ClinicsService);
    private readonly booking = inject(OnlineBookingService);
    private readonly auth = inject(AuthService);
    private readonly readOnly = inject(TenantReadOnlyContextService);

    /** Klinik değişince geç gelen yanıtlar yok sayılır. */
    private generation = 0;
    private lastChange: { key: string; at: number } | null = null;
    private saveTimer: ReturnType<typeof setTimeout> | undefined;
    private inFlight: Promise<boolean> | null = null;
    private readonly savedDraft = signal<StoredSiteConfig | null>(null);
    private readonly past = signal<readonly StoredSiteConfig[]>([]);
    private readonly future = signal<readonly StoredSiteConfig[]>([]);
    private readonly imageRequests = new Set<string>();
    private description = '';
    private savedRecord: ClinicRecordDraft = EMPTY_RECORD;

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly subscriptionBlocked = this.readOnly.mutationBlocked;
    readonly canWrite = computed(() => this.canManage && !this.subscriptionBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<readonly SelectOption[]>([]);
    readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
    readonly loadError = signal<string | null>(null);

    readonly site = signal<ClinicSiteStateDto | null>(null);
    readonly suggestedSlug = signal('');
    readonly isClosedBySubscription = signal(false);
    readonly missingForPublish = signal<readonly ClinicSiteMissing[]>([]);
    readonly missingImageIds = signal<readonly string[]>([]);
    readonly images = signal<readonly ClinicSiteImageDto[]>([]);
    readonly versions = signal<readonly ClinicSiteVersionDto[]>([]);

    readonly stored = signal<StoredSiteConfig>(defaultStoredConfig());
    readonly record = signal<ClinicRecordDraft>(EMPTY_RECORD);
    readonly bookingUrl = signal<string | null>(null);
    readonly slug = computed(() => this.site()?.slug ?? this.suggestedSlug());

    /**
     * Görsel başvurularıyla birleşik yapılandırma: kontroller ve metin önerileri bunu okur. Önizlemede en yakın saat çizilmez (TIER-017):
     * saatler yalnız yayındaki sitede, çizim anında gelir.
     */
    readonly config = computed(() => composeSiteConfig(this.stored(), { ...this.record(), bookingUrl: this.bookingUrl(), nextSlots: [] }, this.slug()));
    /** Önizlemenin çizdiği hâl: `site-image:` başvuruları yetkili uçtan alınan önizleme adreslerine çözülür. */
    readonly renderConfig = computed(() => {
        const urls = this.imageUrls();

        return resolveSiteImages(this.config(), (id) => urls[id] ?? null);
    });

    readonly imageUrls = signal<Readonly<Record<string, string>>>({});
    /** Logodan çıkarılan renk; logo yoksa ya da belirgin renk yoksa boş. */
    readonly logoColor = signal<string | null>(null);

    readonly saveState = signal<SaveState>('idle');
    readonly savedAt = signal<Date | null>(null);
    readonly saveError = signal<string | null>(null);
    readonly actionBusy = signal(false);
    readonly actionError = signal<string | null>(null);
    readonly recordSaving = signal(false);
    readonly recordError = signal<string | null>(null);
    readonly recordSavedAt = signal<Date | null>(null);
    private readonly recordBaseline = signal<ClinicRecordDraft>(EMPTY_RECORD);
    /** Saat kaydı olmayan klinikte uç varsayılan saatleri döner ama yayın kuralı kaydı arar: ekrandaki saatler klinik kaydına yazılmalı. */
    private readonly hoursNotRecorded = computed(() => this.missingForPublish().includes('workingHours') && this.record().workingDays.some((day) => !day.isClosed));
    readonly recordDirty = computed(() => this.hoursNotRecorded() || JSON.stringify(this.record()) !== JSON.stringify(this.recordBaseline()));

    readonly canUndo = computed(() => this.past().length > 0);
    readonly canRedo = computed(() => this.future().length > 0);
    readonly isDraftDirty = computed(() => this.savedDraft() !== this.stored());
    readonly hasUnpublishedChanges = computed(() => !!this.site()?.publishedVersionNumber && (!!this.site()?.hasUnpublishedChanges || this.isDraftDirty()));
    readonly isPublished = computed(() => !!this.site()?.publishedVersionNumber);

    readonly step = signal(0);
    /** Önizleme durumu: taslağa girmez, geçmişe yazılmaz. */
    readonly device = signal<DeviceKey>('masaustu');
    readonly previewPath = signal('/');
    /** Sihirbazda değişen bölüme önizleme kaydırılır. */
    readonly focusSection = signal<{ readonly type: SectionType; readonly tick: number } | null>(null);
    /** Önizlemedeki site kökü: denetim adımı gerçek DOM üzerinde ölçer. */
    readonly previewRoot = signal<HTMLElement | null>(null);

    constructor() {
        const destroyRef = inject(DestroyRef);

        destroyRef.onDestroy(() => {
            void this.flush();
            this.revokeImages();
        });

        effect(() => {
            const ids = usedSiteImageIds(this.stored());
            const listed = this.images().map((image) => image.id);

            untracked(() => [...ids, ...listed].forEach((id) => this.fetchImage(id)));
        });

        effect(() => {
            const logo = siteImageId(this.stored().content.clinic.logo);
            const url = logo ? this.imageUrls()[logo] : null;

            if (!url) {
                this.logoColor.set(null);

                return;
            }

            void dominantColor(url).then((color) => this.logoColor.set(color));
        });
    }

    /** İlk yükleme: etkin klinik, sonra kurumun klinik listesi (seçici). */
    start(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((clinic) => clinic.isActive !== false || clinic.id === active).map((clinic) => ({ value: clinic.id, label: clinic.name }));

                if (options.length) this.clinicOptions.set(options);

                if (!this.clinicId() && options.length) void this.selectClinic(options[0].value);
            },
            error: () => undefined
        });

        if (active) {
            void this.selectClinic(active);
        } else {
            this.loadState.set('error');
            this.loadError.set('Aktif klinik bulunamadı.');
        }
    }

    async selectClinic(clinicId: string): Promise<void> {
        if (clinicId === this.clinicId()) return;

        await this.flush();
        this.clinicId.set(clinicId);
        this.reload();
    }

    reload(): void {
        const clinicId = this.clinicId();
        const generation = ++this.generation;

        clearTimeout(this.saveTimer);
        this.revokeImages();
        this.loadState.set('loading');
        this.loadError.set(null);
        this.saveState.set('idle');
        this.saveError.set(null);
        this.actionError.set(null);
        this.recordError.set(null);
        this.past.set([]);
        this.future.set([]);
        this.versions.set([]);
        forkJoin({
            detail: this.api.get(clinicId),
            clinic: this.clinics.getClinicById(clinicId),
            hours: this.clinics.getWorkingHours(clinicId).pipe(catchError(() => of([]))),
            booking: this.booking.getSettings(clinicId).pipe(catchError(() => of(null)))
        }).subscribe({
            next: ({ detail, clinic, hours, booking }) => {
                if (generation !== this.generation) return;

                const stored = detail.exists && detail.draft ? readStoredConfig(detail.draft) : defaultStoredConfig();
                const record: ClinicRecordDraft = { name: clinic.name, city: clinic.city, district: clinic.district, address: clinic.address, phone: clinic.phone, email: clinic.email, workingDays: toWorkingDays(hours) };

                this.description = clinic.description;
                this.savedRecord = record;
                this.recordBaseline.set(record);
                this.record.set(record);
                this.bookingUrl.set(booking?.isEnabled && booking.bookingUrl ? booking.bookingUrl : null);
                this.stored.set(stored);
                // Site henüz yoksa ilk değişikliğe kadar yazılmaz: sayfayı açmak site oluşturmaz.
                this.savedDraft.set(stored);
                this.site.set(detail.site);
                this.suggestedSlug.set(detail.suggestedSlug ?? '');
                this.applyStatus(detail);
                this.loadState.set('ready');

                if (detail.exists) this.loadVersions();
            },
            error: (err: unknown) => {
                if (generation !== this.generation) return;

                this.loadError.set(clinicSiteErrorMessage(err, 'Site bilgileri yüklenemedi.'));
                this.loadState.set('error');
            }
        });
    }

    /** `key` verilirse aynı alandaki hızlı değişiklikler tek geri al adımında birleşir. */
    patch(change: (config: StoredSiteConfig) => StoredSiteConfig, key?: string): void {
        if (!this.canWrite()) return;

        const current = this.stored();
        const next = change(current);

        if (next === current) return;

        const now = Date.now();
        const merge = !!key && this.lastChange?.key === key && now - this.lastChange.at < COALESCE_MS;

        if (!merge) this.past.update((list) => [...list.slice(-(HISTORY_LIMIT - 1)), current]);

        this.lastChange = key ? { key, at: now } : null;
        this.future.set([]);
        this.setDraft(next);
    }

    patchContent(change: (content: StoredSiteConfig['content']) => StoredSiteConfig['content'], key?: string): void {
        this.patch((config) => ({ ...config, content: change(config.content) }), key);
    }

    patchClinic(change: Partial<StoredSiteConfig['content']['clinic']>, key?: string): void {
        this.patchContent((content) => ({ ...content, clinic: { ...content.clinic, ...change } }), key);
    }

    patchContentFields(change: Partial<Omit<SiteContent, 'clinic'>>, key?: string): void {
        this.patchContent((content) => ({ ...content, ...change }), key);
    }

    patchDesign(change: Partial<SiteDesign>, key?: string): void {
        this.patch((config) => ({ ...config, design: { ...config.design, ...change } }), key);
    }

    patchStructure(change: Partial<SiteStructure>): void {
        this.patch((config) => ({ ...config, structure: { ...config.structure, ...change } }));
    }

    /** Konsept seçimi: bölümler, renk, yazı ve köşe gelir; içerik aynı kalır. */
    applyConcept(key: string): void {
        this.patch((config) => ({ ...config, design: designFromConcept(conceptByKey(key)) }));
    }

    setSection(type: SectionType, key: string): void {
        this.patch((config) => ({ ...config, design: { ...config.design, sections: { ...config.design.sections, [type]: findAlternative(type, key).key } } }));
        this.focus(type);
    }

    focus(type: SectionType): void {
        this.focusSection.update((current) => ({ type, tick: (current?.tick ?? 0) + 1 }));
    }

    undo(): void {
        const previous = this.past().at(-1);

        if (!previous || !this.canWrite()) return;

        this.past.update((list) => list.slice(0, -1));
        this.future.update((list) => [this.stored(), ...list]);
        this.lastChange = null;
        this.setDraft(previous);
    }

    redo(): void {
        const next = this.future()[0];

        if (!next || !this.canWrite()) return;

        this.future.update((list) => list.slice(1));
        this.past.update((list) => [...list, this.stored()]);
        this.lastChange = null;
        this.setDraft(next);
    }

    /** Bekleyen taslağı hemen yazar; yayın, adres ve görsel işlemleri bundan sonra çalışır. Kaydedilemezse `false`. */
    flush(): Promise<boolean> {
        clearTimeout(this.saveTimer);

        return this.runSave();
    }

    /** Çakışmada başkasının taslağını alır: yereldeki değişiklik gider. */
    takeServerDraft(): void {
        this.reload();
    }

    /** Çakışmada kendi taslağını yazar: sunucudaki güncel sürüm numarasıyla yeniden dener, karşı değişikliğin üzerine yazar. */
    async overwriteServerDraft(): Promise<void> {
        const generation = this.generation;

        try {
            const detail = await firstValueFrom(this.api.get(this.clinicId()));

            if (generation !== this.generation) return;

            this.site.set(detail.site);
            this.saveError.set(null);
            this.saveState.set('pending');
            await this.flush();
        } catch (err) {
            this.saveError.set(clinicSiteErrorMessage(err, 'Taslak kaydedilemedi.'));
        }
    }

    setRecord(change: Partial<ClinicRecordDraft>): void {
        if (!this.canWrite()) return;

        this.record.update((record) => ({ ...record, ...change }));
        this.recordError.set(null);
    }

    /** K8: mevcut klinik uçlarıyla yazar; yalnız değişen kısım gider. */
    async saveRecord(): Promise<boolean> {
        if (!this.canWrite() || !this.recordDirty() || this.recordSaving()) return !this.recordDirty();

        const clinicId = this.clinicId();
        const record = this.record();
        const saved = this.savedRecord;
        const profileChanged = (['name', 'city', 'district', 'address', 'phone', 'email'] as const).some((key) => record[key] !== saved[key]);
        const hoursChanged = this.hoursNotRecorded() || JSON.stringify(record.workingDays) !== JSON.stringify(saved.workingDays);
        const hoursMessage = hoursChanged ? workingDaysError(record.workingDays) : null;

        if (hoursMessage) {
            this.recordError.set(hoursMessage);

            return false;
        }

        this.recordSaving.set(true);
        this.recordError.set(null);

        try {
            if (profileChanged) {
                await firstValueFrom(this.clinics.updateClinicFromForm(clinicId, { name: record.name, city: record.city, district: record.district, phone: record.phone, email: record.email, address: record.address, description: this.description }));
            }

            if (hoursChanged) {
                await firstValueFrom(this.clinics.updateWorkingHours(clinicId, { items: fullWeek(record.workingDays).map(toWriteItem) }));
            }

            this.savedRecord = record;
            this.recordBaseline.set(record);
            this.recordSavedAt.set(new Date());
            this.missingForPublish.update((list) => list.filter((key) => key !== 'workingHours' || !hoursChanged));
            this.refreshStatus();

            return true;
        } catch (err) {
            this.recordError.set(err instanceof HttpErrorResponse ? messageFromHttpError(err, 'Klinik kaydı güncellenemedi.') : clinicSiteErrorMessage(err, 'Klinik kaydı güncellenemedi.'));

            return false;
        } finally {
            this.recordSaving.set(false);
        }
    }

    /** Dosyayı küçültür ve yükler; site yoksa önce oluşturur. Başvuruyu döner, yapılandırmaya yazmak çağıranındır. */
    async uploadImage(file: File, maxSide: number | undefined, onProgress: (percent: number) => void): Promise<string> {
        const prepared = await prepareSiteImage(file, maxSide);

        if (!(await this.ensureSite())) {
            throw new Error(this.saveError() ?? 'Taslak kaydedilemedi.');
        }

        const image = await firstValueFrom(this.api.uploadImage(this.clinicId(), prepared, onProgress));

        this.imageRequests.add(image.id);
        this.imageUrls.update((urls) => ({ ...urls, [image.id]: URL.createObjectURL(prepared) }));
        this.images.update((list) => [image, ...list]);

        return image.reference;
    }

    /** Taslakta kullanılan görsel silinmez: backend 409 `ClinicSites.ImageInUse` döner, kullanım yeri söylenir. */
    async deleteImage(imageId: string): Promise<void> {
        this.actionError.set(null);

        if (!(await this.flush())) return;

        await this.run(async () => {
            try {
                const state = await firstValueFrom(this.api.deleteImage(this.clinicId(), imageId));

                if (state) this.site.set(state);

                this.images.update((list) => list.filter((image) => image.id !== imageId));
                this.imageUrls.update((urls) => {
                    const { [imageId]: removed, ...rest } = urls;

                    if (removed) URL.revokeObjectURL(removed);

                    return rest;
                });
                this.imageRequests.delete(imageId);
            } catch (err) {
                if (err instanceof ClinicSiteError && err.code === 'ClinicSites.ImageInUse') {
                    const where = err.usedIn.map((place) => (place === 'published' ? 'yayındaki sürümde' : 'taslakta')).join(' ve ');

                    throw new Error(`Bu görsel ${where || 'sitede'} kullanılıyor; önce kullanıldığı yerden kaldırın.`);
                }

                throw err;
            }
        });
    }

    async publish(): Promise<boolean> {
        this.actionError.set(null);

        if (!(await this.flush())) {
            this.actionError.set(this.saveError() ?? 'Taslak kaydedilemedi, yayınlanmadı.');

            return false;
        }

        const rowVersion = this.site()?.rowVersion;

        if (!rowVersion) return false;

        const done = await this.run(async () => {
            try {
                this.site.set(await firstValueFrom(this.api.publish(this.clinicId(), rowVersion)));
            } catch (err) {
                if (err instanceof ClinicSiteError && err.code === 'ClinicSites.PublishRequirementsNotMet') {
                    this.missingForPublish.set(err.missing);
                    this.missingImageIds.set(err.missingImageIds);
                } else if (err instanceof ClinicSiteError && err.code === 'ClinicSites.ConcurrencyConflict') {
                    this.saveState.set('conflict');
                }

                throw err;
            }
        });

        if (done) {
            this.refreshStatus();
            this.loadVersions();
        }

        return done;
    }

    /** K2: eski sürüm taslağa kopyalanır, yayın değişmez. Mevcut taslak geçmişe yazılır; üstteki Geri Al ile dönülür. */
    async restoreVersion(versionNumber: number): Promise<boolean> {
        this.actionError.set(null);

        if (!(await this.flush())) return false;

        const rowVersion = this.site()?.rowVersion;

        if (!rowVersion) return false;

        return this.run(async () => {
            const state = await firstValueFrom(this.api.restoreVersion(this.clinicId(), versionNumber, rowVersion));
            const detail = await firstValueFrom(this.api.get(this.clinicId()));
            const restored = readStoredConfig(detail.draft);

            this.past.update((list) => [...list.slice(-(HISTORY_LIMIT - 1)), this.stored()]);
            this.future.set([]);
            this.stored.set(restored);
            this.savedDraft.set(restored);
            this.site.set(detail.site ?? state);
            this.applyStatus(detail);
        });
    }

    close(): Promise<boolean> {
        this.actionError.set(null);

        return this.run(async () => this.site.set(await firstValueFrom(this.api.close(this.clinicId()))));
    }

    reopen(): Promise<boolean> {
        this.actionError.set(null);

        return this.run(async () => this.site.set(await firstValueFrom(this.api.reopen(this.clinicId()))));
    }

    checkAddress(slug: string) {
        return this.api.checkAddress(this.clinicId(), slug);
    }

    /** Sözleşme §4: site yoksa adres değişmez; önce taslak yazılır. */
    async changeAddress(slug: string): Promise<boolean> {
        this.actionError.set(null);

        if (!(await this.ensureSite())) return false;

        return this.run(async () => {
            try {
                this.site.set(await firstValueFrom(this.api.changeAddress(this.clinicId(), slug)));
            } catch (err) {
                if (err instanceof ClinicSiteError && err.code === 'ClinicSites.AddressChangeLimitReached') {
                    this.site.update((site) => site && { ...site, addressChangesRemaining: 0 });
                }

                throw err;
            }
        });
    }

    /** Eksikler, görseller ve durum sunucudan tazelenir. Sürüm numarası alınmaz: başka yerden gelen değişiklik kayıtta çakışma olarak görünsün. */
    refreshStatus(): void {
        const generation = this.generation;

        this.api.get(this.clinicId()).subscribe({
            next: (detail) => {
                if (generation !== this.generation) return;

                this.applyStatus(detail);

                const current = this.site();

                if (detail.site && current) this.site.set({ ...detail.site, rowVersion: current.rowVersion });
            },
            error: () => undefined
        });
    }

    loadVersions(): void {
        if (!this.site()) return;

        const generation = this.generation;

        this.api.versions(this.clinicId()).subscribe({
            next: (versions) => {
                if (generation === this.generation) this.versions.set(versions);
            },
            error: () => undefined
        });
    }

    imageSrc(reference: string | null | undefined): string | null {
        const id = siteImageId(reference);

        return id ? (this.imageUrls()[id] ?? null) : null;
    }

    private async ensureSite(): Promise<boolean> {
        if (this.site()) return true;

        return this.flush();
    }

    private applyStatus(detail: { isClosedBySubscription: boolean; missingForPublish: readonly ClinicSiteMissing[]; missingImageIds: readonly string[]; images: readonly ClinicSiteImageDto[] }): void {
        this.isClosedBySubscription.set(detail.isClosedBySubscription);
        this.missingForPublish.set(detail.missingForPublish);
        this.missingImageIds.set(detail.missingImageIds);
        this.images.set(detail.images);
    }

    private setDraft(draft: StoredSiteConfig): void {
        this.stored.set(draft);
        this.saveError.set(null);

        if (this.saveState() === 'conflict') return;

        this.saveState.set('pending');
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => void this.runSave(), SAVE_DELAY_MS);
    }

    private runSave(): Promise<boolean> {
        if (this.inFlight) {
            return this.inFlight.then((ok) => (ok && this.isDraftDirty() ? this.runSave() : ok));
        }

        if (!this.clinicId()) return Promise.resolve(true);

        const exists = !!this.site();

        if (exists && !this.isDraftDirty()) return Promise.resolve(true);

        if (!this.canWrite() || this.saveState() === 'conflict') return Promise.resolve(false);

        const generation = this.generation;
        const snapshot = this.stored();

        this.saveState.set('saving');
        this.inFlight = firstValueFrom(this.api.saveDraft(this.clinicId(), snapshot, this.site()?.rowVersion ?? null))
            .then((state) => {
                this.inFlight = null;

                if (generation !== this.generation) return true;

                this.site.set(state);
                this.savedDraft.set(snapshot);
                this.savedAt.set(new Date());
                this.saveState.set(this.stored() === snapshot ? 'saved' : 'pending');

                if (this.stored() !== snapshot) {
                    clearTimeout(this.saveTimer);
                    this.saveTimer = setTimeout(() => void this.runSave(), SAVE_DELAY_MS);
                }

                return true;
            })
            .catch((err: unknown) => {
                this.inFlight = null;

                if (generation !== this.generation) return false;

                const conflict = err instanceof ClinicSiteError && err.code === 'ClinicSites.ConcurrencyConflict';

                this.saveState.set(conflict ? 'conflict' : 'failed');
                this.saveError.set(clinicSiteErrorMessage(err, 'Taslak kaydedilemedi.'));

                return false;
            });

        return this.inFlight;
    }

    private async run(action: () => Promise<unknown>): Promise<boolean> {
        this.actionBusy.set(true);

        try {
            await action();

            return true;
        } catch (err) {
            this.actionError.set(clinicSiteErrorMessage(err, 'İşlem başarısız.'));

            return false;
        } finally {
            this.actionBusy.set(false);
        }
    }

    private fetchImage(id: string): void {
        if (this.imageRequests.has(id) || !this.clinicId()) return;

        const generation = this.generation;

        this.imageRequests.add(id);
        this.api.imageContent(this.clinicId(), id).subscribe({
            next: (blob) => {
                if (generation === this.generation) this.imageUrls.update((urls) => ({ ...urls, [id]: URL.createObjectURL(blob) }));
            },
            // Silinmiş görsel önizlemede çizilmez; yayın öncesi `missingImageIds` ile söylenir.
            error: () => undefined
        });
    }

    private revokeImages(): void {
        Object.values(this.imageUrls()).forEach((url) => URL.revokeObjectURL(url));
        this.imageRequests.clear();
        this.imageUrls.set({});
    }
}

/** Haftanın eksik günleri kapalı yazılır: kayıt yedi günü de taşır. */
function fullWeek(days: readonly WorkingDay[]): readonly WorkingDay[] {
    return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => days.find((day) => day.dayOfWeek === dayOfWeek) ?? { dayOfWeek, isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null });
}

function toWriteItem(day: WorkingDay) {
    return clinicWorkingHourFormRowToWriteItem({
        dayOfWeek: day.dayOfWeek,
        dayLabel: clinicWorkingHourDayLabel(day.dayOfWeek),
        isClosed: day.isClosed,
        opensAt: day.opensAt ?? '',
        closesAt: day.closesAt ?? '',
        breakStartsAt: day.breakStartsAt ?? '',
        breakEndsAt: day.breakEndsAt ?? ''
    });
}

/** Klinik saat formuyla aynı temel kural: açık günde açılış kapanıştan önce, mola saatlerin içinde. Ayrıntılı denetim backend'dedir. */
export function workingDaysError(days: readonly WorkingDay[]): string | null {
    for (const day of days) {
        if (day.isClosed) continue;

        const name = clinicWorkingHourDayLabel(day.dayOfWeek);

        if (!day.opensAt || !day.closesAt || day.opensAt >= day.closesAt) return `${name}: açılış saati kapanıştan önce olmalı.`;

        if (day.breakStartsAt && day.breakEndsAt && (day.breakStartsAt >= day.breakEndsAt || day.breakStartsAt < day.opensAt || day.breakEndsAt > day.closesAt)) {
            return `${name}: mola, çalışma saatlerinin içinde olmalı.`;
        }
    }

    return null;
}
