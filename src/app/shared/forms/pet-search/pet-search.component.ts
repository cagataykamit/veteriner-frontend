import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, forwardRef, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { AuthService } from '@/app/core/auth/auth.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { filterPetsByClientId, petSelectLabel } from '@/app/shared/forms/client-pet-selection.utils';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';
import { canShowQuickPetCreateButton } from '@/app/shared/forms/quick-create/quick-client-pet-create-visibility.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

export interface PetSearchResult {
    id: string;
    label: string;
}

const PAGE_SIZE = 20;

/**
 * Müşterinin hayvanları için seçici (`app-client-search` ile aynı desen): sahip seçilmeden kapalıdır; odaklanınca/açılır
 * düğmeyle sahibin hayvanları listelenir, yazdıkça sunucu tarafı arama yapılır. Form değeri hayvan kimliğidir (`''`: seçim yok).
 * Sonuç yoksa yetkiliye "Bu müşteri için yeni hayvan" sunar. `forceSelection` kullanılmaz ([ClientSearchComponent] açıklaması).
 */
@Component({
    selector: 'app-pet-search',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoCompleteModule, ButtonModule, QuickPetDialogComponent],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PetSearchComponent), multi: true }],
    template: `
        <p-autocomplete
            [inputId]="inputId()"
            [ngModel]="model()"
            (ngModelChange)="onModelChange($event)"
            [disabled]="disabled() || (requireClient() && !clientId())"
            [suggestions]="suggestions()"
            (completeMethod)="onComplete($event)"
            optionLabel="label"
            [delay]="300"
            [minQueryLength]="0"
            [completeOnFocus]="true"
            [dropdown]="true"
            dropdownMode="blank"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="requireClient() && !clientId() ? 'Önce müşteri seçin' : placeholder()"
            appendTo="body"
            (onBlur)="onTouched()"
        >
            <ng-template #empty>
                <div class="py-1">
                    @if (searchError()) {
                        <span class="text-red-500" role="alert">{{ searchError() }}</span>
                    } @else {
                        <span>Hasta bulunamadı</span>
                        @if (canCreate()) {
                            <div>
                                <p-button
                                    type="button"
                                    label="Bu müşteri için yeni hasta ekle"
                                    icon="pi pi-plus"
                                    [text]="true"
                                    size="small"
                                    styleClass="p-0"
                                    (onClick)="quickPetOpen.set(true)"
                                />
                            </div>
                        }
                    }
                </div>
            </ng-template>
        </p-autocomplete>
        @if (canCreate() && clientId()) {
            <p-button
                type="button"
                [label]="'Bu müşteri için yeni hasta'"
                icon="pi pi-plus"
                [text]="true"
                size="small"
                styleClass="p-0 mt-2"
                (onClick)="quickPetOpen.set(true)"
            />
            <app-quick-pet-dialog [(visible)]="quickPetOpen" [ownerClientId]="clientId()" (petCreated)="onPetCreated($event)" />
        }
    `
})
export class PetSearchComponent implements ControlValueAccessor {
    /** Sahip müşteri kimliği; boşsa alan kapalıdır. */
    readonly clientId = input('');
    /** `false`: sahip seçilmemişken tüm hayvanlar aranır (rapor/liste filtreleri); sahip varsa yine ona daraltılır. */
    readonly requireClient = input(true);
    readonly inputId = input('');
    readonly placeholder = input('Hasta seçin veya yazarak arayın');
    /** Yeni bakım kaydı (randevu, muayene) formları: vefat eden hayvan önerilmez (`status=Active`); sunucu da 409 `Pets.Deceased` döner. */
    readonly activeOnly = input(false);

    private readonly pets = inject(PetsService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);

    readonly model = signal<PetSearchResult | string | null>(null);
    readonly suggestions = signal<PetSearchResult[]>([]);
    readonly searchError = signal<string | null>(null);
    readonly disabled = signal(false);
    readonly quickPetOpen = signal(false);
    readonly canCreate = () => !!this.clientId() && canShowQuickPetCreateButton(this.auth, this.ro, false);

    private readonly term$ = new Subject<string>();
    private selectedId = '';
    private onChange: (value: string) => void = () => undefined;
    onTouched: () => void = () => undefined;

    constructor() {
        this.term$
            .pipe(
                switchMap((term) => this.load(term)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((items) => this.suggestions.set(items));
        // Sahip değişince eski sahibin hayvan önerileri atılır (değer sıfırlamayı form yapar).
        effect(() => {
            this.clientId();
            untracked(() => this.suggestions.set([]));
        });
    }

    onComplete(event: AutoCompleteCompleteEvent): void {
        this.searchError.set(null);
        this.term$.next(event.query ?? '');
    }

    /** Nesne: bir hayvan seçildi. Metin/`null`: yazı değişti veya temizlendi; mevcut seçim geçersiz olur. */
    onModelChange(value: PetSearchResult | string | null): void {
        this.model.set(value);
        const id = value !== null && typeof value === 'object' ? value.id : '';
        if (id !== this.selectedId) {
            this.selectedId = id;
            this.onChange(id);
        }
    }

    /** Hızlı kayıtla eklenen hayvanı seçer. */
    onPetCreated(petId: string): void {
        this.resolve(petId, (p) => this.onModelChange(p));
    }

    writeValue(id: string | null): void {
        const value = (id ?? '').trim();
        this.selectedId = value;
        if (!value) {
            this.model.set(null);
            return;
        }
        const current = this.model();
        if (current !== null && typeof current === 'object' && current.id === value) {
            return;
        }
        this.resolve(value, (p) => {
            if (this.selectedId === value) {
                this.model.set(p);
            }
        });
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    private load(term: string) {
        const clientId = this.clientId().trim();
        if (!clientId && this.requireClient()) {
            return of([] as PetSearchResult[]);
        }
        const search = term.trim();
        const status = this.activeOnly() ? 'Active' : undefined;
        return this.pets.getPets({ page: 1, pageSize: PAGE_SIZE, clientId: clientId || undefined, search: search || undefined, status }).pipe(
            map((r) => {
                const hasOwner = r.items.some((p) => (p.clientId ?? '').trim());
                return (clientId && hasOwner ? filterPetsByClientId(r.items, clientId) : r.items).map((p) => ({ id: p.id, label: petSelectLabel(p) }));
            }),
            catchError((e: unknown) => {
                this.searchError.set(panelHttpFailureMessage(e, 'Hasta listesi yüklenemedi.'));
                return of([] as PetSearchResult[]);
            })
        );
    }

    private resolve(id: string, done: (p: PetSearchResult) => void): void {
        this.pets.getPetById(id).subscribe({
            next: (p) => done({ id: p.id, label: petSelectLabel(p) }),
            error: () => this.model.set(null)
        });
    }
}
