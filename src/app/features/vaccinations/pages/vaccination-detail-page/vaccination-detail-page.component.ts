import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { VaccinationDetailVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { EMPTY, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ADMINISTRATIONS_READ_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { canOpenVaccinationEdit } from '@/app/features/vaccinations/utils/vaccination-access.utils';
import { HbsSectionComponent } from '@/app/entities/hbs/components/hbs-section.component';
import type { HbsEntryVm } from '@/app/entities/hbs/models/hbs.model';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-vaccination-detail-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent, PetAlertBannerComponent, AppLoadingStateComponent, AppEmptyStateComponent, AppErrorStateComponent, AppStatusTagComponent, HbsSectionComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Aşı kaydı kaydedildi.</p>
        }
        @if (stockNotice(); as notice) {
            <p class="mb-4 m-0 text-sm" [class.text-amber-700]="notice.warn" role="status" data-testid="stock-notice">{{ notice.text }}</p>
        }

        @if (loading()) {
            <app-loading-state message="Aşı kaydı yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (vac()) {
            <app-page-header categoryLink="/panel/vaccinations" categoryLinkLabel="Aşı listesine dön" title="Aşı kaydı" [description]="headerDescription(vac()!)">
                @if (canUpdateVaccination && !ro.mutationBlocked()) {
                    <a actions [routerLink]="['/panel/vaccinations', vac()!.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                } @else if (canUpdateVaccination && ro.mutationBlocked()) {
                    <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                }
            </app-page-header>
            <app-pet-alert-banner [petId]="vac()!.petId" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Aşı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.vaccineName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(vac()!.status)" [severity]="statusSeverity(vac()!.status)" />
                            </dd>
                        </dl>
                    </div>
                </div>
                @if (vac()!.linkedAdministration; as adm) {
                    <div class="col-span-12">
                        <div class="card" data-testid="linked-administration">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                                <h5 class="mt-0 mb-0">Stoktan düşen uygulama</h5>
                                @if (canReadAdministrations && vac()!.petId) {
                                    <a routerLink="/panel/administrations" [queryParams]="{ petId: vac()!.petId }" class="text-primary font-medium no-underline text-sm" data-testid="linked-administration-link">Uygulama kaydına git →</a>
                                }
                            </div>
                            <dl class="m-0 grid grid-cols-12 gap-3">
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ adm.productName }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Miktar</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ adm.quantity ?? '—' }} {{ adm.unit }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Seri no</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ adm.lotNumber ?? '—' }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">SKT</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDay(adm.expiryDate) }}</dd>
                            </dl>
                            <p class="text-sm text-muted-color mt-4 mb-0">Aşıyı iptal etmek için bu uygulamayı iptal edin; aşı kaydı da iptal olur. İptalde ürün stoğa iade edilir veya zarar/imha olarak yazılır (iptal eden seçer).</p>
                        </div>
                    </div>
                }
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hasta bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (vac()!.clientId) {
                                    <a [routerLink]="['/panel/clients', vac()!.clientId]" class="text-primary font-medium no-underline">{{ vac()!.clientName }}</a>
                                } @else {
                                    {{ vac()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hasta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (vac()!.petId) {
                                    <a [routerLink]="['/panel/pets', vac()!.petId]" class="text-primary font-medium no-underline">{{ vac()!.petName }}</a>
                                } @else {
                                    {{ vac()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tarihler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            @if (vac()!.status === 0) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Planlanan uygulama tarihi ve saati</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.dueAtUtc | trDateTime }}</dd>
                            } @else if (vac()!.status === 1) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Uygulama</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.appliedAtUtc | trDateTime }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Sonraki uygulama</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.dueAtUtc | trDateTime }}</dd>
                            } @else if (vac()!.status === 2) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Planlı / sonraki tarih</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.dueAtUtc | trDateTime }}</dd>
                            } @else {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Uygulama</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.appliedAtUtc | trDateTime }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Sonraki</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.dueAtUtc | trDateTime }}</dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Kayıt bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.createdAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.updatedAtUtc | trDateTime }}</dd>
                            @if (vac()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a data-testid="linked-examination" [routerLink]="['/panel/examinations', vac()!.examinationId]" class="text-primary font-medium no-underline">Muayene kaydına git →</a>
                                </dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <app-hbs-section kind="vaccination" [recordId]="vac()!.id" [entry]="vac()!.hbs" [canEdit]="canUpdateHbs && !ro.mutationBlocked()" (entryChange)="onHbsChange($event)" />
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (vac()!.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ vac()!.notes }}</p>
                        }
                    </div>
                </div>
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

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly vac = signal<VaccinationDetailVm | null>(null);

    private lastId: string | null = null;

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

    headerDescription(v: VaccinationDetailVm): string {
        const st = v.status;
        const parts: string[] = [];

        if (st === 0) {
            parts.push(v.dueAtUtc ? `${this.formatDateTime(v.dueAtUtc)} (planlanan uygulama)` : 'Planlanmış');
        } else if (st === 1) {
            parts.push(this.formatDateTime(v.appliedAtUtc));
        }

        parts.push(this.statusLabel(v.status));
        parts.push(v.vaccineName);

        return parts.join(' · ');
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

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');

                    if (!id) {
                        this.error.set('Geçersiz aşı kaydı.');
                        this.loading.set(false);

                        return EMPTY;
                    }

                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);

                    return this.vaccinationsService.getVaccinationById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.vac.set(x);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.error.set(panelHttpFailureMessage(e, 'Aşı kaydı yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.vaccinationsService.getVaccinationById(this.lastId).subscribe({
            next: (x) => {
                this.vac.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(panelHttpFailureMessage(e, 'Aşı kaydı yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
