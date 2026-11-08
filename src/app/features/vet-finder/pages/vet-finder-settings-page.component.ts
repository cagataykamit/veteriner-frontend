import { ChangeDetectionStrategy, Component, computed, inject, type OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { type ClinicVetFinderListingDto, formatCoordinates, parseCoordinates, VET_FINDER_MISSING_LABELS } from '@/app/features/vet-finder/models/vet-finder.model';
import { VetFinderService } from '@/app/features/vet-finder/services/vet-finder.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { environment } from '@/environments/environment';

/** Klinik ayrıntı sayfası: il, ilçe, adres, telefon ve çalışma saatleri burada düzenlenir. */
const CLINIC_DETAIL_ROUTE = '/panel/settings/clinics';

/**
 * Veteriner bul ayarı (ADR-047 K4): klinik listelenmeyi açar ve kapatır (varsayılan kapalı), verdiği hizmetleri seçer, isteğe bağlı
 * konum girer. Kart klinik kaydından okunur; eksikler uyarıdır, engel değildir. Tüm paketlerde (K1). Yazma `Clinics.Update` ve salt
 * okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-vet-finder-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        ToggleSwitchModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            [categoryLink]="settingsRoute"
            categoryLinkLabel="Ayarlar"
            title="Veteriner bul"
            description="Hayvan sahipleri kliniğinizi il, ilçe ve hizmete göre Vetinity'nin Veteriner bul sayfalarında bulur. Listelenmek ücretsizdir; istediğiniz an kapatırsınız, kapatınca hemen listeden çıkar."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle ayarlar salt okunur; abonelik açılana kadar kliniğiniz listede görünmez.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Ayarları yalnız klinik yönetim yetkisi olan kullanıcı değiştirir.</p>
        }

        @if (clinicOptions().length > 1) {
            <div class="flex flex-col gap-1 w-full md:max-w-sm mb-4">
                <label for="vetFinderClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                <p-select inputId="vetFinderClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="onClinicChange($event)" optionLabel="label" optionValue="value" class="w-full" />
            </div>
        }

        @if (loading()) {
            <app-loading-state message="Veteriner bul ayarları yükleniyor…" />
        } @else if (error()) {
            <app-error-state [detail]="error()!" (retry)="reload()" />
        } @else if (listing(); as l) {
            <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-12 gap-4">
                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="vetFinderListingTitle">
                    <h5 id="vetFinderListingTitle" class="mt-0">Listelenme</h5>
                    <div class="flex flex-col gap-4">
                        @if (message()) {
                            <p-message [severity]="messageSeverity()" class="w-full" role="status">{{ message() }}</p-message>
                        }
                        <div class="flex items-center gap-3">
                            <p-toggleswitch inputId="vetFinderListed" formControlName="isListed" data-testid="vet-finder-listed" />
                            <label for="vetFinderListed">Kliniğim Veteriner bul'da listelensin</label>
                        </div>
                        <app-status-tag [label]="l.isListed ? 'Listeleniyor' : 'Listelenmiyor'" [severity]="l.isListed ? 'success' : 'secondary'" />
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-muted-color">Kliniğinizin görüneceği sayfa</span>
                            @if (l.isListed) {
                                <a [href]="publicUrl()" target="_blank" rel="noopener" data-testid="vet-finder-url">{{ publicUrl() }}</a>
                            } @else {
                                <span data-testid="vet-finder-url">{{ publicUrl() }}</span>
                            }
                        </div>
                        <small class="text-muted-color">
                            Kartta kliniğinizin adı, il ve ilçesi, adresi, telefonu, seçtiğiniz hizmetler, çalışma saatleri ve "şu an açık" bilgisi görünür. Online randevu açıksa talep düğmesi ve en
                            yakın müsait saat, yayında web siteniz varsa bağlantısı da çıkar. Yorum ve puan yoktur.
                        </small>
                    </div>
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="vetFinderCheckTitle">
                    <h5 id="vetFinderCheckTitle" class="mt-0">Kart bilgileri</h5>
                    @if (l.missing.length) {
                        <ul class="list-none m-0 p-0 flex flex-col gap-2" data-testid="vet-finder-missing">
                            @for (item of l.missing; track item) {
                                <li class="flex items-start gap-2 text-sm"><i class="pi pi-exclamation-circle text-amber-600 mt-1" aria-hidden="true"></i>{{ missingLabels[item] }}</li>
                            }
                        </ul>
                        <a class="text-sm inline-block mt-3" [routerLink]="clinicDetailLink()">Klinik bilgilerini düzenle</a>
                    } @else {
                        <p class="text-sm m-0"><i class="pi pi-check-circle text-green-600 mr-2" aria-hidden="true"></i>Kart için gereken bilgiler tamam.</p>
                    }
                    <p class="text-sm text-muted-color mt-3 mb-0">
                        Sıralama: önce şu an açık klinikler, sonra yakınlık (ziyaretçi konum paylaşırsa mesafe, paylaşmazsa aynı ilçe ve il). Sıra ödemeyle ya da paketle değişmez.
                    </p>
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="vetFinderServicesTitle">
                    <h5 id="vetFinderServicesTitle" class="mt-0 mb-1">Hizmetler</h5>
                    <p class="text-sm text-muted-color mt-0 mb-3">Hayvan sahipleri hizmete göre filtreler. Yalnız kliniğinizde verilen hizmetleri seçin.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" formGroupName="services">
                        @for (service of l.availableServices; track service.key) {
                            <div class="flex items-center gap-2">
                                <p-checkbox [inputId]="'vfService-' + service.key" [formControlName]="service.key" [binary]="true" />
                                <label [for]="'vfService-' + service.key">{{ service.name }}</label>
                            </div>
                        }
                    </div>
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="vetFinderLocationTitle">
                    <h5 id="vetFinderLocationTitle" class="mt-0 mb-1">Konum (isteğe bağlı)</h5>
                    <p class="text-sm text-muted-color mt-0 mb-3">
                        Ziyaretçi konumunu paylaşırsa klinikler mesafeye göre sıralanır. Harita uygulamasında kliniğinizin yerine uzun basıp çıkan koordinatı kopyalayın. Koordinat sayfada gösterilmez,
                        yalnız mesafe görünür.
                    </p>
                    <div class="flex flex-col gap-1">
                        <label for="vetFinderLocation" class="text-sm font-medium text-muted-color">Enlem, boylam</label>
                        <input id="vetFinderLocation" pInputText formControlName="location" placeholder="40.9901, 29.0287" class="w-full" data-testid="vet-finder-location" />
                        @if (locationInvalid()) {
                            <small class="text-red-500">Koordinat "40.9901, 29.0287" biçiminde ve Türkiye içinde olmalı.</small>
                        }
                    </div>
                </section>

                @if (canWrite()) {
                    <div class="col-span-12 flex justify-end">
                        <button pButton type="submit" [disabled]="form.pristine || locationInvalid() || saving()" data-testid="vet-finder-save">
                            <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}
                        </button>
                    </div>
                }
            </form>
        }
    `
})
export class VetFinderSettingsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly settingsRoute = SETTINGS_ROUTE;
    readonly missingLabels = VET_FINDER_MISSING_LABELS;

    private readonly service = inject(VetFinderService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);
    readonly listing = signal<ClinicVetFinderListingDto | null>(null);
    readonly message = signal<string | null>(null);
    readonly messageSeverity = signal<'success' | 'error'>('success');
    readonly locationText = signal('');

    readonly form = this.fb.nonNullable.group({
        isListed: false,
        services: this.fb.nonNullable.group<Record<string, boolean>>({}),
        location: ''
    });

    readonly locationInvalid = computed(() => parseCoordinates(this.locationText()) === 'invalid');
    readonly publicUrl = computed(() => `${environment.siteBaseUrl}${this.listing()?.publicPath ?? ''}`);
    readonly clinicDetailLink = computed(() => `${CLINIC_DETAIL_ROUTE}/${this.clinicId()}`);

    private loadSeq = 0;

    constructor() {
        this.form.controls.location.valueChanges.subscribe((value) => this.locationText.set(value));
    }

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.reload();
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((c) => c.isActive !== false || c.id === active).map((c) => ({ value: c.id, label: c.name }));

                this.clinicOptions.set(options.length > 0 ? options : this.clinicOptions());

                if (!this.clinicId() && options.length > 0) {
                    this.onClinicChange(options[0].value);
                }
            },
            error: () => undefined
        });
    }

    onClinicChange(clinicId: string): void {
        if (clinicId !== this.clinicId()) {
            this.clinicId.set(clinicId);
            this.reload();
        }
    }

    reload(): void {
        const clinicId = this.clinicId();
        const seq = ++this.loadSeq;

        if (!clinicId) {
            this.loading.set(false);
            this.error.set('Aktif klinik bulunamadı.');

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.message.set(null);
        this.service.get(clinicId).subscribe({
            next: (listing) => {
                if (seq !== this.loadSeq) return;

                this.apply(listing);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                if (seq !== this.loadSeq) return;

                this.error.set(e instanceof Error ? e.message : 'Veteriner bul ayarları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    save(): void {
        const location = parseCoordinates(this.form.controls.location.value);

        if (!this.canWrite() || location === 'invalid' || this.saving()) return;

        const value = this.form.getRawValue();

        this.saving.set(true);
        this.service
            .save(this.clinicId(), {
                isListed: value.isListed,
                services: Object.entries(value.services)
                    .filter(([, selected]) => selected)
                    .map(([key]) => key),
                latitude: location?.latitude ?? null,
                longitude: location?.longitude ?? null
            })
            .subscribe({
                next: (listing) => {
                    this.saving.set(false);
                    this.apply(listing);
                    this.showMessage(listing.isListed ? 'Kaydedildi. Kliniğiniz Veteriner bul\'da listeleniyor.' : 'Kaydedildi. Kliniğiniz listelenmiyor.', 'success');
                },
                error: (e: unknown) => {
                    this.saving.set(false);
                    this.showMessage(e instanceof Error ? e.message : 'Veteriner bul ayarları kaydedilemedi.', 'error');
                }
            });
    }

    private apply(listing: ClinicVetFinderListingDto): void {
        const services = this.fb.nonNullable.group<Record<string, boolean>>(
            Object.fromEntries(listing.availableServices.map((s) => [s.key, listing.services.includes(s.key)]))
        );

        this.listing.set(listing);
        this.form.setControl('services', services);
        this.form.reset({ isListed: listing.isListed, services: services.getRawValue(), location: formatCoordinates(listing.latitude, listing.longitude) });

        if (this.canWrite()) this.form.enable();
        else this.form.disable();
    }

    private showMessage(text: string, severity: 'success' | 'error'): void {
        this.message.set(text);
        this.messageSeverity.set(severity);
    }
}
