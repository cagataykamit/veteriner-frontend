import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { type Observable, Subscription } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_READ_CLAIM, PETS_UPDATE_CLAIM, VACCINATIONS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationDetailVm } from '@/app/entities/examination/models/examination-vm.model';
import { PetImagingSectionComponent } from '@/app/entities/imaging/components/pet-imaging-section.component';
import { PetCardHeaderComponent } from '@/app/features/pets/components/pet-card-header.component';
import { PetCardTimelineComponent } from '@/app/features/pets/components/pet-card-timeline.component';
import { PetSummaryCardComponent } from '@/app/features/pets/components/pet-summary-card.component';
import { PetTodoPanelComponent } from '@/app/entities/patient/components/pet-todo-panel.component';
import type { PetOpenItemsVm } from '@/app/entities/pet/models/pet-open-items-vm.model';
import type { PetSummaryVm } from '@/app/entities/pet/models/pet-summary-vm.model';
import { PetStatusDialogComponent } from '@/app/features/pets/components/pet-status-dialog.component';
import type { PetDetailVm, PetHistoryBlockKey, PetHistorySummaryVm, PetStatusUpdateResult } from '@/app/entities/pet/models/pet-vm.model';
import { PetCardDataService } from '@/app/entities/patient/services/pet-card-data.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { buildPetGeneralFields } from '@/app/features/pets/utils/pet-general-fields.utils';
import { buildPetTodo, openItemsSection, ownerOutstandingSection, type PetCardSection, petCardEmphasis } from '@/app/entities/patient/utils/pet-card.utils';
import { DETAIL_FIELD_LIST_CLASS } from '@/app/shared/ui/detail.classes';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TreatmentListItemVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { PatientActionBarComponent } from '@/app/entities/patient/components/patient-action-bar/patient-action-bar.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { RecentlyViewedService, recentlyViewedSubtitle } from '@/app/entities/patient/services/recently-viewed.service';

/**
 * Hasta (hayvan) kartı — okuma öncelikli 360 görünüm (ADR-020 karar 1-3): başlık ve hesap durumu, her zaman görünür eylem çubuğu,
 * Yapılacaklar, klinik özet ve süzgeçli zaman çizelgesi. Kayıt alanları altta salt okunur; düzenleme formu "Düzenle" arkasında.
 * Rol vurgusu yalnız sıralamadır: muayene açabilen klinik özeti, ücret/ödeme alan Yapılacaklar'ı (para önce) öne alır.
 */
@Component({
    selector: 'app-pet-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        PatientActionBarComponent,
        PetCardHeaderComponent,
        PetTodoPanelComponent,
        PetSummaryCardComponent,
        PetCardTimelineComponent,
        PetStatusDialogComponent,
        PetImagingSectionComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Hasta kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Hasta yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (pet(); as p) {
            <app-page-header categoryLink="/panel/pets" categoryLinkLabel="Hasta listesine dön" />

            <app-pet-card-header [pet]="p" [summary]="summary()" [balance]="ownerOutstanding()" [nextAppointment]="nextAppointment()">
                @if (canUpdatePet && !ro.mutationBlocked()) {
                    <!-- İki eylem tek kökte: denetim akışı bloğunda birden çok kök [editAction] yuvasına yansıtılmaz. -->
                    <ng-container editAction>
                        <button
                            pButton
                            type="button"
                            class="p-button-text p-button-secondary"
                            data-testid="pet-status-action"
                            (click)="statusDialogOpen.set(true)"
                        ><i [class]="p.status === 'Deceased' ? 'pi pi-undo' : 'pi pi-minus-circle'"></i>{{ p.status === 'Deceased' ? 'Aktife al' : 'Vefat olarak işaretle' }}</button>
                        <a [routerLink]="['/panel/pets', p.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    </ng-container>
                } @else if (canUpdatePet && ro.mutationBlocked()) {
                    <button editAction pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                }
            </app-pet-card-header>
            @if (canUpdatePet && !ro.mutationBlocked()) {
                <app-pet-status-dialog [(visible)]="statusDialogOpen" [pet]="p" (changed)="onStatusChanged($event)" (stale)="refreshPet()" (appointmentsCancelled)="reloadOpenItems()" />
            }

            @if (p.ownerId) {
                <app-patient-action-bar [sticky]="true" [clientId]="p.ownerId" [petId]="p.id" [petLabel]="p.name + ' — ' + p.speciesName" [clientName]="p.clientName" [petDeceased]="p.status === 'Deceased'" />
            }

            <!--
                Satır ızgarası (müşteri kartıyla aynı dil): klinik özet | Yapılacaklar (8/4); zaman çizelgesi | kayıt bilgileri (8/4); görüntüleme (12) —
                satırdaki kartlar eşit yükseklikte. Rol vurgusu 1. satırda sırayı belirler. Kırılımlar içerik alanına göredir (container sorgusu).
            -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 @4xl:col-span-8 min-w-0" [class.order-first]="emphasis === 'clinical'" data-testid="clinical-column">
                        <app-pet-summary-card [summary]="summary()" [loading]="summaryLoading()" [error]="summaryError()" [lastExamination]="lastExamination()" [followUps]="followUps()" [vaccinationPlanLink]="vaccinationPlanLink()" (retry)="retrySummary()" />
                    </div>
                    <div class="col-span-12 @4xl:col-span-4 min-w-0" [class.order-first]="emphasis === 'frontDesk'" data-testid="todo-column">
                        <app-pet-todo-panel [view]="todo()" [retryable]="true" (retry)="reloadOpenItems()" />
                    </div>
                </div>

                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 @4xl:col-span-8 min-w-0 flex flex-col gap-4">
                        @if (historyError()) {
                            <div class="card mb-0">
                                <app-error-state [detail]="historyError()!" (retry)="retryHistory()" />
                            </div>
                        }
                        <app-pet-card-timeline class="block flex-1 min-h-0" [petId]="p.id" [payments]="payments()" />
                    </div>
                    <section class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4" aria-labelledby="pet-record-title">
                        <h5 id="pet-record-title" class="mt-0 mb-2">Kayıt bilgileri</h5>
                        <!-- Klinik özetle aynı etiket/değer deseni: etiket üstte küçük/büyük harf, değer altında; satırlar ince çizgiyle ayrılır. -->
                        <dl [class]="fieldListClass">
                            @for (field of generalFields().filled; track field.label) {
                                <div>
                                    <dt>{{ field.label }}</dt>
                                    <dd class="font-medium text-surface-900 dark:text-surface-0">{{ field.value }}</dd>
                                </div>
                            }
                            @if (showEmptyFields()) {
                                @for (field of generalFields().empty; track field.label) {
                                    <div>
                                        <dt>{{ field.label }}</dt>
                                        <dd class="field-empty">{{ field.value }}</dd>
                                    </div>
                                }
                            }
                            @if (hasText(p.clientEmail)) {
                                <div>
                                    <dt>Sahip e-posta</dt>
                                    <dd class="font-medium text-surface-900 dark:text-surface-0">{{ p.clientEmail }}</dd>
                                </div>
                            }
                        </dl>
                        @if (generalFields().empty.length > 0) {
                            <button type="button" class="mt-3 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer" data-testid="toggle-empty-fields" (click)="showEmptyFields.set(!showEmptyFields())">
                                {{ showEmptyFields() ? 'Boş alanları gizle' : 'Boş alanları göster (' + generalFields().empty.length + ')' }}
                            </button>
                        }
                        @if (hasText(p.notes)) {
                            <h6 class="mt-4 mb-2 text-sm text-muted-color font-medium">Notlar</h6>
                            <p class="m-0 whitespace-pre-wrap" data-testid="pet-notes">{{ p.notes }}</p>
                        }
                    </section>
                </div>

                @if (canReadImaging && p.ownerId) {
                    <app-pet-imaging-section [petId]="p.id" [clientId]="p.ownerId" />
                }
            </div>
        }
    `
})
export class PetDetailPageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly petsService = inject(PetsService);
    private readonly cardData = inject(PetCardDataService);
    private readonly auth = inject(AuthService);
    private readonly recentlyViewed = inject(RecentlyViewedService);
    readonly ro = inject(TenantReadOnlyContextService);
    readonly canReadImaging = this.auth.hasOperationClaim(IMAGING_READ_CLAIM);

    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    private readonly loader = new RouteEntityLoader<PetDetailVm>({
        fetch: (id) => this.petsService.getPetById(id),
        invalidIdMessage: 'Geçersiz pet.',
        onRouteChange: () => this.resetCard(),
        onReload: () => this.resetCard(),
        onLoaded: (p) => this.onPetLoaded(p)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly pet = this.loader.value;
    readonly showEmptyFields = signal(false);
    readonly generalFields = computed(() => {
        const p = this.pet();

        return p ? buildPetGeneralFields(p) : { filled: [], empty: [] };
    });

    readonly historyError = signal<string | null>(null);
    readonly history = signal<PetHistorySummaryVm | null>(null);
    readonly summaryLoading = signal(false);
    readonly summaryError = signal<string | null>(null);
    readonly summary = signal<PetSummaryVm | null>(null);

    /** Yapılacaklar ve başlıktaki açık borç/sonraki randevu tek uçtan (`GET /pets/{id}/open-items`). */
    readonly openItems = signal<PetCardSection<PetOpenItemsVm>>(null);
    readonly lastExamination = signal<PetCardSection<ExaminationDetailVm>>(null);
    readonly followUps = signal<PetCardSection<TreatmentListItemVm[]>>(null);

    readonly canUpdatePet = this.auth.hasOperationClaim(PETS_UPDATE_CLAIM);
    /** Aşı planı önerisi (TIER-005): planlayabilen kullanıcıya, bakımı süren hayvanda; paket kilidi hedef sayfadadır (üst paket kutusu). */
    readonly vaccinationPlanLink = computed(() => {
        const p = this.pet();

        return p && p.status !== 'Deceased' && this.auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM) && !this.ro.mutationBlocked()
            ? ['/panel/pets', p.id, 'vaccination-plan']
            : null;
    });
    readonly emphasis = petCardEmphasis((claim) => this.auth.hasOperationClaim(claim));
    protected readonly fieldListClass = DETAIL_FIELD_LIST_CLASS;

    readonly payments = computed(() => this.historyBlock('Payments', (h) => h.recentPayments));
    readonly ownerOutstanding = computed(() => ownerOutstandingSection(this.openItems()));
    readonly nextAppointment = computed(() => openItemsSection(this.openItems(), (o) => o.nextAppointment));
    readonly statusDialogOpen = signal(false);

    readonly todo = computed(() =>
        buildPetTodo(this.openItems(), {
            petId: this.pet()?.id ?? '',
            clientId: this.pet()?.ownerId ?? null,
            hasClaim: (claim) => this.auth.hasOperationClaim(claim),
            mutationBlocked: this.ro.mutationBlocked(),
            emphasis: this.emphasis
        })
    );

    private cardSubscriptions = new Subscription();
    private examinationSubscription: Subscription | null = null;
    private openItemsSubscription: Subscription | null = null;

    readonly hasText = (v: string | null | undefined) => !!v && !!v.trim() && v.trim() !== '—';

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

    ngOnDestroy(): void {
        this.resetCard();
    }

    reload(): void {
        this.loader.reload();
    }

    /** Durum yanıtı yeni `rowVersion` taşır; açık işler yeniden okunur (vefat eden hastada aşı bölümü boş gelir). */
    onStatusChanged(result: PetStatusUpdateResult): void {
        const p = this.pet();

        if (p) {
            this.pet.set({ ...p, ...result });
            this.loadOpenItems(p.id);
        }
    }

    /** Yalnız hayvan kaydı (durum, rowVersion) yenilenir; kart bölümleri yerinde kalır (eşzamanlılık çakışması sonrası). */
    refreshPet(): void {
        if (!this.loader.id) {
            return;
        }

        this.petsService.getPetById(this.loader.id).subscribe({ next: (p) => this.pet.set(p), error: () => undefined });
    }

    retrySummary(): void {
        if (this.loader.id) {
            this.loadSummary(this.loader.id);
        }
    }

    retryHistory(): void {
        if (this.loader.id) {
            this.loadHistory(this.loader.id);
        }
    }

    /** Randevu iptali sonrası (sonraki randevu açık işlerdedir) ve Yapılacaklar'da "Yeniden dene"; okumadır, salt okunur kiracıda da çalışır. */
    reloadOpenItems(): void {
        if (this.loader.id) {
            this.loadOpenItems(this.loader.id);
        }
    }

    /** Geçmiş özeti bloğu kart bölümüne: blok `omittedBlocks`'ta ise `null` (yetki yok). */
    private historyBlock<T>(key: PetHistoryBlockKey, pick: (h: PetHistorySummaryVm) => T): PetCardSection<T> {
        if (this.historyError()) {
            return { state: 'error' };
        }

        const h = this.history();

        if (!h) {
            return { state: 'loading' };
        }

        return h.omittedBlocks.includes(key) ? null : { state: 'ok', data: pick(h) };
    }

    private onPetLoaded(p: PetDetailVm): void {
        this.recentlyViewed.record({ kind: 'pet', id: p.id, title: p.name, subtitle: recentlyViewedSubtitle(p.speciesName, p.clientName) });
        this.loadHistory(p.id);
        this.loadSummary(p.id);
        this.loadOpenItems(p.id);
        this.bind(this.cardData.followUpTreatments(p.id), this.followUps);
    }

    private bind<T>(source: Observable<PetCardSection<T>>, target: { set(value: PetCardSection<T>): void }): void {
        this.cardSubscriptions.add(source.subscribe((section) => target.set(section)));
    }

    private resetCard(): void {
        this.cardSubscriptions.unsubscribe();
        this.cardSubscriptions = new Subscription();
        this.examinationSubscription?.unsubscribe();
        this.examinationSubscription = null;
        this.openItemsSubscription?.unsubscribe();
        this.openItemsSubscription = null;

        for (const s of [this.openItems, this.lastExamination, this.followUps]) {
            s.set(null);
        }

        this.summary.set(null);
        this.summaryLoading.set(false);
        this.summaryError.set(null);
        this.history.set(null);
        this.historyError.set(null);
    }

    private loadSummary(petId: string): void {
        this.summaryLoading.set(true);
        this.summaryError.set(null);
        this.petsService.getPetSummary(petId).subscribe({
            next: (s) => {
                this.summary.set(s);
                this.summaryLoading.set(false);
                this.loadLastExamination(s.lastExamination.data?.id ?? null);
            },
            error: (e: Error) => {
                this.summaryError.set(panelHttpFailureMessage(e, 'Hasta özeti yüklenemedi.'));
                this.summaryLoading.set(false);
            }
        });
    }

    private loadLastExamination(examinationId: string | null): void {
        this.examinationSubscription?.unsubscribe();
        this.examinationSubscription = this.cardData.examination(examinationId).subscribe((section) => this.lastExamination.set(section));
    }

    private loadOpenItems(petId: string): void {
        this.openItemsSubscription?.unsubscribe();
        this.openItemsSubscription = this.cardData.openItems(petId).subscribe((section) => this.openItems.set(section));
    }

    private loadHistory(petId: string): void {
        this.historyError.set(null);
        this.petsService.getPetHistorySummary(petId).subscribe({
            next: (h) => {
                this.history.set(h);
            },
            error: (e: Error) => {
                this.historyError.set(panelHttpFailureMessage(e, 'Hasta geçmişi yüklenemedi.'));
            }
        });
    }
}
