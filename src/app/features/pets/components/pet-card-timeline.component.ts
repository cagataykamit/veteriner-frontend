import { Component, computed, effect, inject, input, OnDestroy, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { Subscription } from 'rxjs';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { PetTimelineItemComponent } from '@/app/features/pets/components/pet-timeline-item.component';
import type { PetTimelineItemVm } from '@/app/features/pets/models/pet-timeline-vm.model';
import type { PetHistoryPaymentItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import {
    mergePetTimelineItems,
    PET_CARD_TIMELINE_FILTERS,
    PET_TIMELINE_PAYMENT_TYPE,
    type PetCardTimelineFilter,
    paymentToPetTimelineItem,
    petTimelineOmittedTypesLabel
} from '@/app/features/pets/utils/pet-timeline.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Kartta gösterilen olay sayısı; geçmiş özetinin ödeme bloğu da en yeni 10 kaydı döndürür (birleştirme kesin kalır). */
export const PET_CARD_TIMELINE_LIMIT = 10;

/**
 * Hasta kartında süzgeçli tek zaman çizelgesi (ADR-020 karar 2d): en yeni olaylar; tarih süzgeci, iptaller ve sayfalama tam sayfadadır.
 * Timeline ucu ödemeyi döndürmediğinden ödemeler geçmiş özetinden gelir ve "Tümü"nde tarihe göre karışır.
 */
@Component({
    selector: 'app-pet-card-timeline',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, SelectButtonModule, PetTimelineItemComponent],
    template: `
        <section class="card mb-0" aria-labelledby="pet-card-timeline-title">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h5 id="pet-card-timeline-title" class="m-0">Zaman çizelgesi</h5>
                @if (filter() === 'payment') {
                    <a routerLink="/panel/payments" [queryParams]="{ petId: petId() }" class="text-primary font-medium no-underline text-sm">Tüm ödemeler →</a>
                } @else {
                    <a [routerLink]="['/panel/pets', petId(), 'timeline']" class="text-primary font-medium no-underline text-sm" data-testid="full-timeline-link">
                        Tarih süzgeçli tam liste →
                    </a>
                }
            </div>

            <p-selectbutton
                styleClass="mb-3 flex-wrap"
                [options]="filters"
                optionLabel="label"
                optionValue="value"
                [allowEmpty]="false"
                ariaLabel="Olay türü süzgeci"
                [ngModel]="filter()"
                (ngModelChange)="filter.set($event)"
            />

            @if (filter() === 'payment' && payments() === null) {
                <p class="m-0 text-muted-color" data-testid="payments-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Ödemeleri görme yetkiniz yok</p>
            } @else if (loading()) {
                <p class="m-0 text-muted-color text-sm">Yükleniyor…</p>
            } @else if (error()) {
                <div class="flex flex-wrap items-center gap-3" data-testid="timeline-error">
                    <p class="m-0 text-orange-600 dark:text-orange-400"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>{{ error() }}</p>
                    <button pButton type="button" size="small" label="Tekrar dene" icon="pi pi-refresh" severity="secondary" (click)="reload()"></button>
                </div>
            } @else {
                @if (omittedLabel(); as omitted) {
                    <p class="mt-0 mb-2 text-muted-color text-sm" data-testid="omitted-note" role="note">
                        <i class="pi pi-lock mr-1" aria-hidden="true"></i>Yetkiniz olmadığı için gösterilmiyor: {{ omitted }}
                    </p>
                }
                @if (filter() === 'all' && payments()?.state === 'error') {
                    <p class="mt-0 mb-2 text-orange-600 dark:text-orange-400 text-sm" data-testid="payments-unavailable">
                        <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Ödemeler alınamadı; liste ödemesiz gösteriliyor.
                    </p>
                }
                @if (items().length === 0) {
                    <p class="m-0 text-muted-color" data-testid="timeline-empty">Bu süzgece uyan kayıt yok.</p>
                } @else {
                    <ol class="list-none m-0 p-0" data-testid="timeline-list">
                        @for (item of items(); track item.key) {
                            <li appPetTimelineItem [item]="item"></li>
                        }
                    </ol>
                }
            }
        </section>
    `
})
export class PetCardTimelineComponent implements OnDestroy {
    private readonly petsService = inject(PetsService);

    readonly petId = input.required<string>();
    /** Geçmiş özetinin ödeme bloğu; `null` = ödeme okuma yetkisi yok. */
    readonly payments = input<PetCardSection<PetHistoryPaymentItemVm[]>>({ state: 'loading' });

    readonly filters = [...PET_CARD_TIMELINE_FILTERS];
    readonly filter = signal<PetCardTimelineFilter>('all');

    private readonly events = signal<PetTimelineItemVm[]>([]);
    private readonly eventsLoading = signal(false);
    private readonly eventsError = signal<string | null>(null);
    private readonly omittedTypes = signal<string[]>([]);
    /** Ödeme yetkisi yoksa "Tümü"nde ödeme de yetki notuna girer ("kayıt yok" ile karışmasın). */
    readonly omittedLabel = computed(() => {
        const filter = this.filter();
        if (filter === 'payment') {
            return '';
        }
        const types = filter === 'all' && this.payments() === null ? [...this.omittedTypes(), PET_TIMELINE_PAYMENT_TYPE] : this.omittedTypes();
        return petTimelineOmittedTypesLabel(types);
    });

    private readonly paymentItems = computed(() => {
        const p = this.payments();
        return p?.state === 'ok'
            ? p.data.map((row) => paymentToPetTimelineItem(row, formatMoney(row.amount, row.currency ?? 'TRY'), paymentMethodLabel(row.method)))
            : [];
    });

    readonly items = computed(() => {
        switch (this.filter()) {
            case 'payment':
                return this.paymentItems().slice(0, PET_CARD_TIMELINE_LIMIT);
            case 'all':
                return mergePetTimelineItems(this.events(), this.paymentItems(), PET_CARD_TIMELINE_LIMIT);
            default:
                return this.events();
        }
    });

    readonly loading = computed(() => (this.filter() === 'payment' ? this.payments()?.state === 'loading' : this.eventsLoading()));
    readonly error = computed(() => {
        if (this.filter() === 'payment') {
            return this.payments()?.state === 'error' ? 'Ödemeler yüklenemedi.' : null;
        }
        return this.eventsError();
    });

    private request: Subscription | null = null;

    constructor() {
        effect(() => {
            const petId = this.petId();
            const filter = this.filter();
            untracked(() => this.load(petId, filter));
        });
    }

    ngOnDestroy(): void {
        this.request?.unsubscribe();
    }

    reload(): void {
        this.load(this.petId(), this.filter());
    }

    private load(petId: string, filter: PetCardTimelineFilter): void {
        this.request?.unsubscribe();
        this.request = null;
        if (filter === 'payment' || !petId) {
            return;
        }
        const types = [...(PET_CARD_TIMELINE_FILTERS.find((f) => f.value === filter)?.types ?? [])];
        this.eventsLoading.set(true);
        this.eventsError.set(null);
        this.request = this.petsService.getPetTimeline(petId, { types, limit: PET_CARD_TIMELINE_LIMIT }).subscribe({
            next: (page) => {
                this.events.set(page.items);
                this.omittedTypes.set(page.omittedTypes);
                this.eventsLoading.set(false);
            },
            error: (e: Error) => {
                this.events.set([]);
                this.eventsError.set(e.message ?? 'Zaman çizelgesi yüklenemedi.');
                this.eventsLoading.set(false);
            }
        });
    }
}
