import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { EMPTY, type Observable, Subscription, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import type { LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { PetCardHeaderComponent } from '@/app/features/pets/components/pet-card-header.component';
import { PetCardTimelineComponent } from '@/app/features/pets/components/pet-card-timeline.component';
import { PetSummaryCardComponent } from '@/app/features/pets/components/pet-summary-card.component';
import { PetTodoPanelComponent } from '@/app/features/pets/components/pet-todo-panel.component';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import { PetStatusDialogComponent } from '@/app/features/pets/components/pet-status-dialog.component';
import type { PetDetailVm, PetHistoryBlockKey, PetHistorySummaryVm, PetStatusUpdateResult } from '@/app/features/pets/models/pet-vm.model';
import { PetCardDataService } from '@/app/features/pets/services/pet-card-data.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { buildPetGeneralFields } from '@/app/features/pets/utils/pet-general-fields.utils';
import {
    buildPetTodo,
    nextScheduledAppointment,
    okData,
    type PetCardSection,
    petCardEmphasis,
    petIdentityParts
} from '@/app/features/pets/utils/pet-card.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { PatientActionBarComponent } from '@/app/shared/panel/patient-action-bar/patient-action-bar.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

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
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
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
            <app-page-header categoryLink="/panel/pets" categoryLinkLabel="Hasta listesine dön" [title]="p.name" [description]="identity()">
                @if (canUpdatePet && !ro.mutationBlocked()) {
                    <!-- İki eylem tek kökte: denetim akışı bloğunda birden çok kök [actions] yuvasına yansıtılmaz. -->
                    <ng-container actions>
                        <button
                            pButton
                            type="button"
                            [label]="p.status === 'Deceased' ? 'Aktife al' : 'Vefat olarak işaretle'"
                            [icon]="p.status === 'Deceased' ? 'pi pi-undo' : 'pi pi-minus-circle'"
                            class="p-button-text p-button-secondary"
                            data-testid="pet-status-action"
                            (click)="statusDialogOpen.set(true)"
                        ></button>
                        <a [routerLink]="['/panel/pets', p.id, 'edit']" pButton type="button" label="Düzenle" icon="pi pi-pencil" class="p-button-secondary"></a>
                    </ng-container>
                } @else if (canUpdatePet && ro.mutationBlocked()) {
                    <button actions pButton type="button" label="Düzenle (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                }
            </app-page-header>

            @if (p.ownerId) {
                <app-patient-action-bar
                    [sticky]="true"
                    [clientId]="p.ownerId"
                    [petId]="p.id"
                    [petLabel]="p.name + ' — ' + p.speciesName"
                    [clientName]="p.clientName"
                    [petDeceased]="p.status === 'Deceased'"
                />
            }
            @if (canUpdatePet && !ro.mutationBlocked()) {
                <app-pet-status-dialog [(visible)]="statusDialogOpen" [pet]="p" [nextAppointment]="nextAppointmentData()" (changed)="onStatusChanged($event)" (stale)="refreshPet()" />
            }

            <app-pet-card-header [pet]="p" [summary]="summary()" [balance]="balance()" [nextAppointment]="nextAppointment()" />

            <div class="grid grid-cols-12 gap-4 mb-4">
                <div class="col-span-12 lg:col-span-5" [class.order-first]="emphasis === 'frontDesk'" data-testid="todo-column">
                    <app-pet-todo-panel [view]="todo()" />
                </div>
                <div class="col-span-12 lg:col-span-7" [class.order-first]="emphasis === 'clinical'" data-testid="clinical-column">
                    <app-pet-summary-card
                        [summary]="summary()"
                        [loading]="summaryLoading()"
                        [error]="summaryError()"
                        [lastExamination]="lastExamination()"
                        [followUps]="followUps()"
                        (retry)="retrySummary()"
                    />
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 lg:col-span-8">
                    @if (historyError()) {
                        <div class="card mb-0">
                            <app-error-state [detail]="historyError()!" (retry)="retryHistory()" />
                        </div>
                    }
                    <app-pet-card-timeline [petId]="p.id" [payments]="payments()" />
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <section class="card mb-0" aria-labelledby="pet-record-title">
                        <h5 id="pet-record-title" class="mt-0 mb-4">Kayıt bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-2">
                            @for (field of generalFields().filled; track field.label) {
                                <dt class="col-span-5 text-muted-color text-sm">{{ field.label }}</dt>
                                <dd class="col-span-7 m-0 break-words">{{ field.value }}</dd>
                            }
                            @if (showEmptyFields()) {
                                @for (field of generalFields().empty; track field.label) {
                                    <dt class="col-span-5 text-muted-color text-sm">{{ field.label }}</dt>
                                    <dd class="col-span-7 m-0 text-muted-color">{{ field.value }}</dd>
                                }
                            }
                            @if (hasText(p.clientEmail)) {
                                <dt class="col-span-5 text-muted-color text-sm">Sahip e-posta</dt>
                                <dd class="col-span-7 m-0 break-words">{{ p.clientEmail }}</dd>
                            }
                        </dl>
                        @if (generalFields().empty.length > 0) {
                            <button
                                type="button"
                                class="mt-3 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer"
                                data-testid="toggle-empty-fields"
                                (click)="showEmptyFields.set(!showEmptyFields())"
                            >
                                {{ showEmptyFields() ? 'Boş alanları gizle' : 'Boş alanları göster (' + generalFields().empty.length + ')' }}
                            </button>
                        }
                        @if (hasText(p.notes)) {
                            <h6 class="mt-4 mb-2 text-sm text-muted-color font-medium">Notlar</h6>
                            <p class="m-0 whitespace-pre-wrap" data-testid="pet-notes">{{ p.notes }}</p>
                        }
                    </section>
                </div>
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
    readonly ro = inject(TenantReadOnlyContextService);

    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pet = signal<PetDetailVm | null>(null);
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

    readonly scheduledVaccinations = signal<PetCardSection<VaccinationListItemVm[]>>(null);
    readonly requestedLabs = signal<PetCardSection<LabResultListItemVm[]>>(null);
    readonly pendingCharges = signal<PetCardSection<ChargeSuggestionVm[]>>(null);
    readonly balance = signal<PetCardSection<ClientBalanceVm>>(null);
    readonly lastExamination = signal<PetCardSection<ExaminationDetailVm>>(null);
    readonly followUps = signal<PetCardSection<TreatmentListItemVm[]>>(null);

    readonly canUpdatePet = this.auth.hasOperationClaim(PETS_UPDATE_CLAIM);
    readonly emphasis = petCardEmphasis((claim) => this.auth.hasOperationClaim(claim));

    readonly identity = computed(() => {
        const p = this.pet();
        return p ? petIdentityParts(p, this.summary()?.latestWeight.data?.weightKg ?? null).join(' · ') : '';
    });

    readonly payments = computed(() => this.historyBlock('Payments', (h) => h.recentPayments));
    readonly nextAppointment = computed(() => this.historyBlock('Appointments', (h) => nextScheduledAppointment(h.recentAppointments)));
    readonly nextAppointmentData = computed(() => okData(this.nextAppointment()) ?? null);
    readonly statusDialogOpen = signal(false);

    readonly todo = computed(() =>
        buildPetTodo(
            {
                scheduledVaccinations: this.scheduledVaccinations(),
                requestedLabs: this.requestedLabs(),
                recentLabs: this.historyBlock('LabResults', (h) => h.recentLabResults),
                pendingCharges: this.pendingCharges(),
                balance: this.balance()
            },
            {
                petId: this.pet()?.id ?? '',
                clientId: this.pet()?.ownerId ?? null,
                hasClaim: (claim) => this.auth.hasOperationClaim(claim),
                mutationBlocked: this.ro.mutationBlocked(),
                emphasis: this.emphasis
            }
        )
    );

    private lastId: string | null = null;
    private cardSubscriptions = new Subscription();
    private examinationSubscription: Subscription | null = null;

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

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    this.resetCard();
                    if (!id) {
                        this.error.set('Geçersiz pet.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.petsService.getPetById(id);
                })
            )
            .subscribe({
                next: (p) => this.onPetLoaded(p),
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    ngOnDestroy(): void {
        this.resetCard();
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.resetCard();
        this.loading.set(true);
        this.error.set(null);
        this.petsService.getPetById(this.lastId).subscribe({
            next: (p) => this.onPetLoaded(p),
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    /** Durum yanıtı yeni `rowVersion` taşır; kart verileri durumdan bağımsız olduğundan yeniden okunmaz. */
    onStatusChanged(result: PetStatusUpdateResult): void {
        const p = this.pet();
        if (p) {
            this.pet.set({ ...p, ...result });
        }
    }

    /** Yalnız hayvan kaydı (durum, rowVersion) yenilenir; kart bölümleri yerinde kalır (eşzamanlılık çakışması sonrası). */
    refreshPet(): void {
        if (!this.lastId) {
            return;
        }
        this.petsService.getPetById(this.lastId).subscribe({ next: (p) => this.pet.set(p), error: () => undefined });
    }

    retrySummary(): void {
        if (this.lastId) {
            this.loadSummary(this.lastId);
        }
    }

    retryHistory(): void {
        if (this.lastId) {
            this.loadHistory(this.lastId);
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
        this.pet.set(p);
        this.loading.set(false);
        this.loadHistory(p.id);
        this.loadSummary(p.id);
        this.bind(this.cardData.scheduledVaccinations(p.id), this.scheduledVaccinations);
        this.bind(this.cardData.requestedLabs(p.id), this.requestedLabs);
        this.bind(this.cardData.pendingCharges(p.id), this.pendingCharges);
        this.bind(this.cardData.ownerBalance(p.ownerId), this.balance);
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
        for (const s of [this.scheduledVaccinations, this.requestedLabs, this.pendingCharges, this.balance, this.lastExamination, this.followUps]) {
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
                this.summaryError.set(e.message ?? 'Hasta özeti yüklenemedi.');
                this.summaryLoading.set(false);
            }
        });
    }

    private loadLastExamination(examinationId: string | null): void {
        this.examinationSubscription?.unsubscribe();
        this.examinationSubscription = this.cardData.examination(examinationId).subscribe((section) => this.lastExamination.set(section));
    }

    private loadHistory(petId: string): void {
        this.historyError.set(null);
        this.petsService.getPetHistorySummary(petId).subscribe({
            next: (h) => {
                this.history.set(h);
            },
            error: (e: Error) => {
                this.historyError.set(e.message ?? 'Hasta geçmişi yüklenemedi.');
            }
        });
    }
}
