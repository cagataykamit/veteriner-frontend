import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_CREATE_CLAIM, CLIENTS_READ_CLAIM, PETS_CREATE_CLAIM, PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PatientSearchService, type OwnerRowVm, type PatientRowVm, type PatientSearchResultVm } from '@/app/features/patients/services/patient-search.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VisitArrivalDialogComponent } from '@/app/features/visits/components/visit-arrival-dialog.component';
import { VisitQuickRegistrationComponent } from '@/app/features/visits/components/visit-quick-registration.component';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { buildPatientActions, type PatientAction, type PatientActionKey } from '@/app/shared/panel/patient-action-bar/patient-actions.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SearchInputComponent, SEARCH_MIN_LENGTH } from '@/app/shared/ui/search-input/search-input.component';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Satırda tek tıkla görünen eylemler; diğerleri (aşı, lab, yatış…) hasta kartındaki eylem çubuğundadır. */
const ROW_ACTION_KEYS: ReadonlySet<PatientActionKey> = new Set(['arrive', 'examination', 'appointment']);

/**
 * Hastalar girişi (ADR-017 K3 ince ayar, P5): arama-öncelikli. Büyük arama kutusu üst çubuktaki global aramanın aynı
 * mantığını kullanır; her sonuç hayvan + sahip birlikte gelir ve satırdan Geldi / Muayene başlat / Randevu al tek tıktır.
 * Müşteri ve Hayvan tabloları ikinci düzeydir (sekmeler); sonuç yoksa "Yeni kayıt" öne çıkar.
 */
@Component({
    selector: 'app-patients-home-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent, SearchInputComponent, VisitArrivalDialogComponent, VisitQuickRegistrationComponent],
    template: `
        <app-page-header title="Hastalar" description="Hastayı ya da sahibini arayın; geliş, muayene ve randevuya sonuçtan geçin." />

        <div class="card">
            <label for="patientSearch" class="block text-sm font-medium text-muted-color mb-2">Hasta veya sahip ara</label>
            <div class="[&_input]:text-xl [&_input]:py-4">
                <app-search-input
                    inputId="patientSearch"
                    ariaLabel="Hasta veya sahip ara"
                    placeholder="Hayvan adı, sahip adı soyadı, telefon veya mikroçip"
                    [(value)]="term"
                    (search)="onSearch()"
                />
            </div>

            <div class="mt-4" aria-live="polite">
                @switch (status()) {
                    @case ('idle') {
                        <p class="m-0 text-sm text-muted-color">En az {{ minLength }} karakter yazın. Ad-soyad sırası, Türkçe karakter ve telefon biçimi önemli değildir.</p>
                    }
                    @case ('loading') {
                        <p class="m-0 text-sm text-muted-color"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i>Aranıyor…</p>
                    }
                    @case ('error') {
                        <p class="m-0 text-red-500" role="alert">Arama yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.</p>
                    }
                    @case ('ready') {
                        @if (result(); as r) {
                            @if (r.failedKinds.length) {
                                <p class="m-0 mb-3 text-sm text-red-500" role="alert">{{ failedMessage(r) }}</p>
                            }
                            @if (r.patients.length === 0 && r.owners.length === 0) {
                                <p class="m-0 text-muted-color">"{{ searchedTerm() }}" için sonuç bulunamadı.</p>
                            }
                            <ul class="list-none m-0 p-0 flex flex-col gap-2" aria-label="Arama sonuçları">
                                @for (p of r.patients; track p.petId) {
                                    <li class="patient-row rounded-border border border-surface-200 dark:border-surface-700 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <div class="min-w-0 grow basis-64">
                                            <a [routerLink]="['/panel/pets', p.petId]" class="font-semibold text-lg text-primary no-underline">{{ p.petName }}</a>
                                            @if (p.deceased) {
                                                <span
                                                    class="ml-2 text-xs font-medium text-muted-color border border-surface-300 dark:border-surface-600 rounded-border px-1.5 py-0.5 align-middle"
                                                    data-testid="patient-deceased"
                                                    >Vefat</span
                                                >
                                            }
                                            @if (p.summary) {
                                                <span class="text-muted-color"> · {{ p.summary }}</span>
                                            }
                                            <div class="text-sm text-muted-color">
                                                @if (p.ownerName) {
                                                    Sahip: {{ p.ownerName }}
                                                }
                                                @if (p.ownerPhone) {
                                                    · {{ p.ownerPhone }}
                                                }
                                                @if (p.microchip) {
                                                    · Mikroçip: {{ p.microchip }}
                                                }
                                            </div>
                                        </div>
                                        @if (!ro.mutationBlocked() && p.clientId) {
                                            <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="p.petName + ' için eylemler'">
                                                @for (a of rowActions(p); track a.key; let first = $first) {
                                                    @if (a.route) {
                                                        <a [routerLink]="a.route" [queryParams]="a.queryParams" pButton type="button" size="small" [label]="a.label" [icon]="a.icon" [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"></a>
                                                    } @else {
                                                        <button pButton type="button" size="small" [label]="a.label" [icon]="a.icon" [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'" (click)="openArrival(p)"></button>
                                                    }
                                                }
                                            </div>
                                        }
                                    </li>
                                }
                                @for (o of r.owners; track o.clientId) {
                                    <li class="owner-row rounded-border border border-surface-200 dark:border-surface-700 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <div class="min-w-0 grow basis-64">
                                            <a [routerLink]="['/panel/clients', o.clientId]" class="font-semibold text-lg text-primary no-underline">{{ o.name }}</a>
                                            <span class="text-muted-color"> · Sahip</span>
                                            <div class="text-sm text-muted-color">{{ o.phone }} · Kayıtlı hayvan yok</div>
                                        </div>
                                        @if (!ro.mutationBlocked()) {
                                            @for (a of ownerActions(o); track a.key) {
                                                <a [routerLink]="a.route" [queryParams]="a.queryParams" pButton type="button" size="small" [label]="a.label" [icon]="a.icon" class="p-button-outlined p-button-secondary"></a>
                                            }
                                        }
                                    </li>
                                }
                            </ul>
                        }
                    }
                }
            </div>

            @if (canRegister && !ro.mutationBlocked()) {
                <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                    @if (registering()) {
                        <app-visit-quick-registration [searchTerm]="searchedTerm()" (registered)="onRegistered($event)" (cancelled)="registering.set(false)" />
                    } @else {
                        <div class="flex flex-wrap items-center gap-3">
                            <p-button
                                type="button"
                                label="Yeni kayıt: müşteri ve hayvan"
                                icon="pi pi-user-plus"
                                [severity]="noResults() ? 'primary' : 'secondary'"
                                [outlined]="!noResults()"
                                (onClick)="registering.set(true)"
                            />
                            @if (noResults()) {
                                <span class="text-sm text-muted-color">Kayıt bulunamadı; yeni hasta olarak ekleyebilirsiniz.</span>
                            }
                        </div>
                    }
                </div>
            }
        </div>

        @if (canListClients || canListPets) {
            <p class="mt-4 mb-0 text-sm text-muted-color">
                Tümünü listele:
                @if (canListPets) {
                    <a routerLink="/panel/pets" class="text-primary font-medium no-underline">Hayvanlar</a>
                }
                @if (canListPets && canListClients) {
                    ·
                }
                @if (canListClients) {
                    <a routerLink="/panel/clients" class="text-primary font-medium no-underline">Müşteriler</a>
                }
            </p>
        }

        <app-visit-arrival-dialog [(visible)]="arrivalOpen" [presetPet]="arrivalPet()" (arrived)="onArrived()" />
    `
})
export class PatientsHomePageComponent {
    protected readonly minLength = SEARCH_MIN_LENGTH;
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly search = inject(PatientSearchService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canRegister = this.auth.hasOperationClaim(CLIENTS_CREATE_CLAIM) && this.auth.hasOperationClaim(PETS_CREATE_CLAIM);
    readonly canListClients = this.auth.hasOperationClaim(CLIENTS_READ_CLAIM);
    readonly canListPets = this.auth.hasOperationClaim(PETS_READ_CLAIM);

    readonly term = signal('');
    readonly searchedTerm = signal('');
    readonly status = signal<SearchStatus>('idle');
    readonly result = signal<PatientSearchResultVm | null>(null);
    readonly registering = signal(false);
    readonly arrivalOpen = signal(false);
    readonly arrivalPet = signal<PetSuggestion | null>(null);
    readonly noResults = computed(() => {
        const r = this.result();
        return this.status() === 'ready' && !!r && r.patients.length === 0 && r.owners.length === 0;
    });

    private readonly term$ = new Subject<string>();

    constructor() {
        this.term$
            .pipe(
                // Boş terim: yazı kısaldı; bekleyen arama `switchMap` ile iptal edilir.
                switchMap((term) => (term ? this.search.search(term).pipe(catchError(() => of(null))) : of(undefined))),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((result) => {
                if (result === undefined) {
                    return;
                }
                this.result.set(result);
                this.status.set(result ? 'ready' : 'error');
            });
    }

    onSearch(): void {
        const term = this.term().trim();
        if (term.length < this.minLength) {
            this.result.set(null);
            this.status.set('idle');
            this.searchedTerm.set('');
            this.term$.next('');
            return;
        }
        this.searchedTerm.set(term);
        this.status.set('loading');
        this.term$.next(term);
    }

    rowActions(p: PatientRowVm): PatientAction[] {
        return buildPatientActions({ clientId: p.clientId!, petId: p.petId, petDeceased: p.deceased }, (c) => this.auth.hasOperationClaim(c)).filter((a) => ROW_ACTION_KEYS.has(a.key));
    }

    ownerActions(o: OwnerRowVm): PatientAction[] {
        return buildPatientActions({ clientId: o.clientId, petId: null }, (c) => this.auth.hasOperationClaim(c)).filter((a) => a.key === 'newPet');
    }

    openArrival(p: PatientRowVm): void {
        this.arrivalPet.set({ id: p.petId, label: `${p.petName} · Sahip: ${p.ownerName || '—'}`, clientId: p.clientId, clientName: p.ownerName });
        this.arrivalOpen.set(true);
    }

    onArrived(): void {
        void this.router.navigate(['/panel/today']);
    }

    /** Yeni kayıtla oluşan hastanın kartına gidilir; Geldi / Muayene oradaki eylem çubuğundadır. */
    onRegistered(pet: PetSuggestion): void {
        void this.router.navigate(['/panel/pets', pet.id]);
    }

    failedMessage(r: PatientSearchResultVm): string {
        const names = r.failedKinds.map((kind) => (kind === 'clients' ? 'Müşteri' : 'Hayvan'));
        return `${names.join(' ve ')} araması yapılamadı.`;
    }
}
