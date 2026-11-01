import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { VaccinationDetailVm } from '@/app/entities/vaccination/models/vaccination-vm.model';
import { administrationRouteSiteText } from '@/app/entities/administration/utils/administration-route.utils';
import { VaccinationsService } from '@/app/entities/vaccination/services/vaccinations.service';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/entities/vaccination/utils/vaccination-status.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { DETAIL_TILE_GRID_CLASS } from '@/app/shared/ui/detail.classes';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { ADMINISTRATIONS_READ_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { canOpenVaccinationEdit } from '@/app/entities/vaccination/utils/vaccination-access.utils';
import { HbsSectionComponent } from '@/app/entities/hbs/components/hbs-section.component';
import type { HbsEntryVm } from '@/app/entities/hbs/models/hbs.model';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

@Component({
    selector: 'app-vaccination-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailSubjectLineComponent,
        RecordHistoryButtonComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        HbsSectionComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Aşı kaydı kaydedildi.</p>
        }
        @if (stockNotice(); as notice) {
            <p class="mb-4 m-0 text-sm" [class]="notice.warn ? 'text-amber-700 dark:text-amber-300' : ''" role="status" data-testid="stock-notice">{{ notice.text }}</p>
        }

        @if (loading()) {
            <app-loading-state message="Aşı kaydı yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (vac(); as v) {
            <app-page-header categoryLink="/panel/vaccinations" categoryLinkLabel="Aşı listesine dön" />

            <!-- Kimlik kartı: aşı adı + durum rozeti, tarih, kayıt satırı, hasta/sahip; sağda Düzenle ve geçmiş; gösterge şeridi (tarihler, yol/bölge, muayene). -->
            <app-detail-identity-card icon="pi pi-shield" [title]="v.vaccineName" [subtitle]="headerDate(v)" [meta]="'Oluşturulma: ' + (v.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (v.updatedAtUtc | trDateTime)" ariaLabel="Aşı kimliği" testId="vaccination-identity-card">
                <app-status-tag badges [label]="statusLabel(v.status)" [severity]="statusSeverity(v.status)" />
                <app-detail-subject-line [petId]="v.petId" [petName]="v.petName" [clientId]="v.clientId" [clientName]="v.clientName" />
                <ng-container actions>
                    @if (canUpdateVaccination && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/vaccinations', v.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdateVaccination && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                    <app-record-history-button resource="vaccinations" [recordId]="v.id" />
                </ng-container>
                <!-- Her if bloğunda tek kök öğe: çok köklü blok [stat] yuvasına değil varsayılan yuvaya yansır. -->
                <div stat>
                    <dt>{{ v.status === 0 ? 'Planlanan uygulama' : v.status === 2 ? 'Planlı / sonraki tarih' : 'Uygulama' }}</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ (v.status === 0 || v.status === 2 ? v.dueAtUtc : v.appliedAtUtc) | trDateTime }}</dd>
                </div>
                @if (v.status !== 0 && v.status !== 2) {
                    <div stat>
                        <dt>Sonraki uygulama</dt>
                        <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ v.dueAtUtc | trDateTime }}</dd>
                    </div>
                }
                <div stat>
                    <dt>Uygulama yolu / bölgesi</dt>
                    <dd data-testid="route-site">
                        @if (routeSiteText(); as rs) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ rs }}</span>
                        } @else {
                            <span class="field-empty">—</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Muayene</dt>
                    <dd>
                        @if (v.examinationId) {
                            <a data-testid="linked-examination" [routerLink]="['/panel/examinations', v.examinationId]" class="text-primary font-semibold no-underline">Muayene kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı muayene yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>
            <app-pet-alert-banner [petId]="v.petId" />

            <!-- Satır ızgarası: stoktan düşen uygulama | notlar (8/4, eşit yükseklik); HBS tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    @if (v.linkedAdministration; as adm) {
                        <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8" data-testid="linked-administration">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h5 class="mt-0 mb-0">Stoktan düşen uygulama</h5>
                                @if (canReadAdministrations && v.petId) {
                                    <a routerLink="/panel/administrations" [queryParams]="{ petId: v.petId }" class="text-primary font-medium no-underline text-sm" data-testid="linked-administration-link">Uygulama kaydına git →</a>
                                }
                            </div>
                            <dl [class]="tileGridClass">
                                <div>
                                    <dt>Ürün</dt>
                                    <dd class="font-semibold break-words">{{ adm.productName }}</dd>
                                </div>
                                <div>
                                    <dt>Üretici</dt>
                                    <dd>
                                        @if (adm.productManufacturer) {
                                            <span class="font-semibold">{{ adm.productManufacturer }}</span>
                                        } @else {
                                            <span class="field-empty">—</span>
                                        }
                                    </dd>
                                </div>
                                <div>
                                    <dt>Miktar</dt>
                                    <dd class="font-semibold tabular-nums">{{ adm.quantity ?? '—' }} {{ adm.unit }}</dd>
                                </div>
                                <div>
                                    <dt>Seri no</dt>
                                    <dd>
                                        @if (adm.lotNumber) {
                                            <span class="font-semibold break-all">{{ adm.lotNumber }}</span>
                                        } @else {
                                            <span class="field-empty">—</span>
                                        }
                                    </dd>
                                </div>
                                <div>
                                    <dt>SKT</dt>
                                    <dd class="font-semibold tabular-nums">{{ formatDay(adm.expiryDate) }}</dd>
                                </div>
                            </dl>
                            <p class="text-sm text-muted-color mt-3 mb-0">Aşıyı iptal etmek için bu uygulamayı iptal edin; aşı kaydı da iptal olur. İptalde ürün stoğa iade edilir veya zarar/imha olarak yazılır (iptal eden seçer).</p>
                        </div>
                    }
                    <div class="card mb-0 h-full min-w-0 col-span-12" [class.@4xl:col-span-4]="!!v.linkedAdministration">
                        <h5 class="mt-0 mb-3">Notlar</h5>
                        @if (v.notes === emptyMark) {
                            <p class="m-0 field-empty">Not yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ v.notes }}</p>
                        }
                    </div>
                </div>
                <app-hbs-section kind="vaccination" [recordId]="v.id" [entry]="v.hbs" [canEdit]="canUpdateHbs && !ro.mutationBlocked()" (entryChange)="onHbsChange($event)" />
            </div>
        }
    `
})
export class VaccinationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly vaccinationsService = inject(VaccinationsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly emptyMark = '—';
    readonly showSavedBanner = signal(false);
    /** Kayıt formundan gelen stok bildirimi (kalan stok, minimum altı uyarısı); yenilemede kaybolur. */
    readonly stockNotice = signal<{ text: string; warn: boolean } | null>((this.router.getCurrentNavigation()?.extras.state?.['stockNotice'] as { text: string; warn: boolean } | undefined) ?? null);
    readonly canReadAdministrations = this.auth.hasOperationClaim(ADMINISTRATIONS_READ_CLAIM);
    readonly formatDay = (v: string | null) => (v ? formatDateDisplay(v) : '—');
    protected readonly tileGridClass = DETAIL_TILE_GRID_CLASS;

    private readonly loader = new RouteEntityLoader<VaccinationDetailVm>({
        fetch: (id) => this.vaccinationsService.getVaccinationById(id),
        invalidIdMessage: 'Geçersiz aşı kaydı.',
        errorMessage: (e) => panelHttpFailureMessage(e, 'Aşı kaydı yüklenemedi.')
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly vac = this.loader.value;
    readonly routeSiteText = computed(() => {
        const v = this.vac();

        return v ? administrationRouteSiteText(v) : null;
    });

    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    /** Düzenleme rotasının yetki koşuluyla aynı (aşı kataloğu okuma dahil). */
    readonly canUpdateVaccination = canOpenVaccinationEdit((c) => this.auth.hasOperationClaim(c));
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;
    /** HBS (ATS) geri kaydı yalnız `Vaccinations.Update` ister; kesinleşmiş muayeneye bağlı aşıda da açıktır. */
    readonly canUpdateHbs = this.auth.hasOperationClaim(VACCINATIONS_UPDATE_CLAIM);

    /** HBS geri kaydı klinik içeriği değiştirmez; yalnız HBS alanı güncellenir. */
    onHbsChange(hbs: HbsEntryVm): void {
        this.vac.update((v) => (v ? { ...v, hbs } : v));
    }

    /** Kimlik kartı alt başlığı: planlıda planlanan tarih, uygulanmışta uygulama tarihi; diğer durumlarda boş. */
    headerDate(v: VaccinationDetailVm): string {
        if (v.status === 0) {
            return v.dueAtUtc ? `${this.formatDateTime(v.dueAtUtc)} (planlanan uygulama)` : 'Planlanmış';
        }

        return v.status === 1 ? this.formatDateTime(v.appliedAtUtc) : '';
    }

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }
}
