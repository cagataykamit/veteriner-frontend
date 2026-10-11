import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { Subscription } from 'rxjs';
import type { PetTimelineItemVm, PetTimelineType } from '@/app/features/pets/models/pet-timeline-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import {
    PET_TIMELINE_TYPES,
    PET_TIMELINE_VOIDED_LABEL,
    petTimelineEventLink,
    petTimelineExaminationLink,
    petTimelineOmittedTypesLabel,
    petTimelineStatusLabel,
    petTimelineTypeIcon,
    petTimelineTypeLabel
} from '@/app/features/pets/utils/pet-timeline.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const PAGE_SIZE = 20;

/**
 * Hasta zaman çizelgesi (`GET /pets/{id}/timeline`): tür bazlı simgeler, opak imleçle "daha fazla yükle".
 * İptal/yanlış işaretli kayıtlar varsayılan gizlidir; süzgeç değişince liste baştan yüklenir.
 */
@Component({
    selector: 'app-pet-timeline-page',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a [routerLink]="['/panel/pets', petId()]" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan kartına dön</a>

        <app-page-header title="Zaman çizelgesi" subtitle="Hasta geçmişi" [description]="petName() ?? ''" />

        <div class="card mb-4">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-3" role="group" aria-label="Süzgeçler">
                @for (t of typeOptions; track t.value) {
                    <div class="flex items-center gap-2">
                        <p-checkbox
                            [ngModel]="isTypeSelected(t.value)"
                            (ngModelChange)="toggleType(t.value, $event)"
                            [binary]="true"
                            [inputId]="'tl-type-' + t.value"
                        />
                        <label [attr.for]="'tl-type-' + t.value" class="cursor-pointer"><i class="pi {{ t.icon }} mr-1" aria-hidden="true"></i>{{ t.label }}</label>
                    </div>
                }
                <div class="flex items-center gap-2">
                    <p-checkbox
                        [ngModel]="includeVoided()"
                        (ngModelChange)="setIncludeVoided($event)"
                        [binary]="true"
                        inputId="tl-include-voided"
                    />
                    <label for="tl-include-voided" class="cursor-pointer">İptal / yanlış işaretli kayıtları göster</label>
                </div>
            </div>
            @if (selectedTypes().length === 0) {
                <p class="m-0 mt-2 text-muted-color text-sm">Tür seçilmedi: yetkili olduğunuz tüm kayıt türleri gösterilir.</p>
            }
        </div>

        @if (omittedTypes().length > 0) {
            <p class="mb-4 mt-0 text-muted-color" data-testid="omitted-note" role="note">
                <i class="pi pi-lock mr-1" aria-hidden="true"></i>
                Bazı kayıtlar yetkiniz olmadığı için gösterilmiyor ({{ omittedLabel() }}).
            </p>
        }

        @if (loading()) {
            <app-loading-state message="Zaman çizelgesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (items().length === 0) {
            <div class="card">
                <app-empty-state [message]="emptyMessage()" />
            </div>
        } @else {
            <ol class="list-none m-0 p-0 card" data-testid="timeline-list">
                @for (item of items(); track item.key) {
                    <li class="flex gap-3 py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0" [class.opacity-60]="item.isVoided">
                        <i
                            class="pi {{ icon(item.type) }} text-xl text-primary mt-1"
                            [attr.title]="typeLabel(item.type)"
                            [attr.aria-label]="typeLabel(item.type)"
                            data-testid="type-icon"
                        ></i>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-baseline gap-x-2">
                                <span class="text-muted-color text-sm">{{ formatDt(item.eventAtUtc) }}</span>
                                <span class="text-muted-color text-sm">· {{ typeLabel(item.type) }}</span>
                                @if (statusLabel(item); as status) {
                                    <span class="text-sm" data-testid="status">· {{ status }}</span>
                                }
                                @if (item.isVoided) {
                                    <span class="text-sm font-medium text-red-600 dark:text-red-400" data-testid="voided">· {{ voidedLabel }}</span>
                                }
                            </div>
                            <div class="font-medium break-words">
                                @if (eventLink(item); as link) {
                                    <a [routerLink]="link" class="text-primary no-underline" data-testid="event-link">{{ item.title }}</a>
                                } @else {
                                    {{ item.title }}
                                }
                                @if (item.summary) {
                                    <span class="text-sm font-normal text-red-600 dark:text-red-400"> · {{ item.summary }}</span>
                                }
                            </div>
                            <div class="flex flex-wrap gap-x-3 text-sm text-muted-color">
                                @if (item.clinicName) {
                                    <span>{{ item.clinicName }}</span>
                                }
                                @if (examinationLink(item); as exam) {
                                    <a [routerLink]="exam" class="text-primary no-underline" data-testid="examination-link">Bağlı muayene →</a>
                                }
                            </div>
                        </div>
                    </li>
                }
            </ol>

            @if (nextCursor()) {
                <div class="flex flex-col items-center gap-2 mt-4">
                    @if (loadMoreError()) {
                        <p class="m-0 text-orange-600 dark:text-orange-400" data-testid="load-more-error">{{ loadMoreError() }}</p>
                    }
                    <button
                        pButton
                        type="button"
                        class="p-button-secondary"
                        icon="pi pi-angle-down"
                        [label]="loadingMore() ? 'Yükleniyor…' : 'Daha fazla yükle'"
                        [disabled]="loadingMore()"
                        data-testid="load-more"
                        (click)="loadMore()"
                    ></button>
                </div>
            } @else {
                <p class="text-center text-muted-color text-sm mt-4 mb-0">Başka kayıt yok.</p>
            }
        }
    `
})
export class PetTimelinePageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly typeOptions = PET_TIMELINE_TYPES;
    readonly voidedLabel = PET_TIMELINE_VOIDED_LABEL;
    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly icon = petTimelineTypeIcon;
    readonly typeLabel = petTimelineTypeLabel;
    readonly statusLabel = petTimelineStatusLabel;
    readonly eventLink = petTimelineEventLink;
    readonly examinationLink = petTimelineExaminationLink;

    readonly petId = signal('');
    readonly petName = signal<string | null>(null);
    readonly selectedTypes = signal<PetTimelineType[]>([]);
    readonly includeVoided = signal(false);

    readonly items = signal<PetTimelineItemVm[]>([]);
    readonly nextCursor = signal<string | null>(null);
    readonly omittedTypes = signal<string[]>([]);
    readonly loading = signal(false);
    readonly loadingMore = signal(false);
    readonly error = signal<string | null>(null);
    readonly loadMoreError = signal<string | null>(null);

    readonly omittedLabel = computed(() => petTimelineOmittedTypesLabel(this.omittedTypes()));
    readonly emptyMessage = computed(() =>
        this.includeVoided() || this.selectedTypes().length > 0
            ? 'Seçili süzgeçlere uyan kayıt yok.'
            : 'Henüz kayıt yok. İptal / yanlış işaretli kayıtlar varsayılan olarak gizlidir.'
    );

    private request: Subscription | null = null;

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id')?.trim() ?? '';
            this.petId.set(id);
            this.petName.set(null);
            if (!id) {
                this.error.set('Geçersiz hayvan.');
                return;
            }
            this.petsService
                .getPetById(id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({ next: (p) => this.petName.set(p.name), error: () => this.petName.set(null) });
            this.reload();
        });
    }

    isTypeSelected(type: PetTimelineType): boolean {
        return this.selectedTypes().includes(type);
    }

    toggleType(type: PetTimelineType, selected: boolean): void {
        const next = this.selectedTypes().filter((t) => t !== type);
        if (selected) {
            next.push(type);
        }
        this.selectedTypes.set(PET_TIMELINE_TYPES.map((d) => d.value).filter((v) => next.includes(v)));
        this.reload();
    }

    setIncludeVoided(value: boolean): void {
        this.includeVoided.set(value);
        this.reload();
    }

    /** İlk sayfayı baştan yükler (süzgeç değişimi veya yeniden deneme); uçuştaki istek iptal edilir. */
    reload(): void {
        const petId = this.petId();
        if (!petId) {
            return;
        }
        this.request?.unsubscribe();
        this.loading.set(true);
        this.loadingMore.set(false);
        this.error.set(null);
        this.loadMoreError.set(null);
        this.items.set([]);
        this.nextCursor.set(null);
        this.request = this.petsService.getPetTimeline(petId, this.query(null)).subscribe({
            next: (page) => {
                this.items.set(page.items);
                this.nextCursor.set(page.nextCursor);
                this.omittedTypes.set(page.omittedTypes);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Zaman çizelgesi yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    /** Aynı süzgeçlerle `nextCursor` sonrasını ekler; çift tıklamada ikinci istek atılmaz. */
    loadMore(): void {
        const cursor = this.nextCursor();
        if (!cursor || this.loadingMore() || this.loading()) {
            return;
        }
        this.loadingMore.set(true);
        this.loadMoreError.set(null);
        this.request = this.petsService.getPetTimeline(this.petId(), this.query(cursor)).subscribe({
            next: (page) => {
                const known = new Set(this.items().map((i) => i.key));
                this.items.update((list) => [...list, ...page.items.filter((i) => !known.has(i.key))]);
                this.nextCursor.set(page.nextCursor);
                this.omittedTypes.set(page.omittedTypes);
                this.loadingMore.set(false);
            },
            error: (e: Error) => {
                this.loadMoreError.set(e.message ?? 'Daha fazla kayıt yüklenemedi.');
                this.loadingMore.set(false);
            }
        });
    }

    private query(cursor: string | null) {
        return {
            types: this.selectedTypes(),
            includeVoided: this.includeVoided(),
            limit: PAGE_SIZE,
            cursor
        };
    }
}
