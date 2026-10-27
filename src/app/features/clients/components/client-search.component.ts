import { CommonModule } from '@angular/common';
import { Component, DestroyRef, forwardRef, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENT_SEARCH_MIN_LENGTH, ClientSearchService } from '@/app/features/clients/services/client-search.service';
import type { ClientSearchResultVm } from '@/app/features/clients/services/client-search.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { canShowQuickClientCreateButton } from '@/app/shared/forms/quick-create/quick-client-pet-create-visibility.utils';
import { QuickClientDialogComponent } from '@/app/features/clients/components/quick-client-dialog.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Yazdıkça arayan müşteri seçici (en az 2 karakter, 300 ms bekleme, sunucu tarafı arama).
 * Form değeri müşteri kimliğidir (`''`: seçim yok). Sonuç yoksa yetkiliye "Yeni müşteri ekle" sunar.
 *
 * `forceSelection` KULLANILMAZ: PrimeNG, panel kapanırken (ör. min. uzunluktan kısa tek karakter yazılınca) seçimsiz metni
 * siler ve yazmayı imkânsız kılar. Listeden seçilmemiş metin form değerini boş (`''`) bırakır.
 */
@Component({
    selector: 'app-client-search',
    standalone: true,
    imports: [CommonModule, FormsModule, AutoCompleteModule, ButtonModule, QuickClientDialogComponent],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ClientSearchComponent), multi: true }],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-autocomplete
            [inputId]="inputId()"
            [ngModel]="model()"
            (ngModelChange)="onModelChange($event)"
            [disabled]="disabled()"
            [suggestions]="suggestions()"
            (completeMethod)="onComplete($event)"
            optionLabel="label"
            [delay]="300"
            [minQueryLength]="minLength"
            [showClear]="true"
            [fluid]="true"
            [placeholder]="placeholder()"
            appendTo="body"
            (onBlur)="onTouched()"
        >
            <ng-template #item let-c>
                <div class="min-w-0">
                    <div class="font-medium">{{ c.fullName }}</div>
                    <div class="text-sm text-muted-color">
                        {{ c.phone }}
                        @if (c.petNames.length) {
                            · Hastalar: {{ c.petNames.join(', ') }}
                        }
                    </div>
                </div>
            </ng-template>
            <ng-template #empty>
                <div class="py-1">
                    @if (searchError()) {
                        <span class="text-red-500" role="alert">{{ searchError() }}</span>
                    } @else {
                        <span>Müşteri bulunamadı</span>
                        @if (canCreate()) {
                            <div>
                                <button pButton type="button" [text]="true" size="small" class="p-0" (click)="quickClientOpen.set(true)"><i class="p-button-icon pi pi-user-plus"></i>Yeni müşteri ekle</button>
                            </div>
                        }
                    }
                </div>
            </ng-template>
        </p-autocomplete>
        @if (canCreate()) {
            <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onClientCreated($event)" />
        }
    `
})
export class ClientSearchComponent implements ControlValueAccessor {
    readonly inputId = input('');
    readonly placeholder = input('Ad, telefon, hasta adı veya mikroçip ile arayın');

    protected readonly minLength = CLIENT_SEARCH_MIN_LENGTH;

    private readonly search = inject(ClientSearchService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);

    readonly model = signal<ClientSearchResultVm | string | null>(null);
    readonly suggestions = signal<ClientSearchResultVm[]>([]);
    readonly searchError = signal<string | null>(null);
    readonly disabled = signal(false);
    readonly quickClientOpen = signal(false);
    readonly canCreate = () => canShowQuickClientCreateButton(this.auth, this.ro, false);

    private readonly term$ = new Subject<string>();
    private selectedId = '';
    private onChange: (value: string) => void = () => undefined;
    onTouched: () => void = () => undefined;

    constructor() {
        // `switchMap` eski yanıtı atar; hata sonucu boş liste + mesajla gösterilir.
        this.term$
            .pipe(
                switchMap((term) =>
                    this.search.search(term).pipe(
                        catchError((e: unknown) => {
                            this.searchError.set(panelHttpFailureMessage(e, 'Müşteri araması yapılamadı.'));

                            return of([] as ClientSearchResultVm[]);
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((items) => this.suggestions.set(items));
    }

    onComplete(event: AutoCompleteCompleteEvent): void {
        this.searchError.set(null);
        this.term$.next(event.query);
    }

    /** Nesne: bir sonuç seçildi. Metin/`null`: yazı değişti veya temizlendi; mevcut seçim geçersiz olur. */
    onModelChange(value: ClientSearchResultVm | string | null): void {
        this.model.set(value);
        const id = value !== null && typeof value === 'object' ? value.id : '';

        if (id !== this.selectedId) {
            this.selectedId = id;
            this.onChange(id);
        }
    }

    onClientCreated(clientId: string): void {
        this.search.getById(clientId).subscribe({
            next: (c) => this.onModelChange(c),
            error: () => undefined
        });
    }

    writeValue(id: string | null): void {
        const value = (id ?? '').trim();

        this.selectedId = value;

        if (!value) {
            this.model.set(null);

            return;
        }

        if (this.model() !== null && typeof this.model() === 'object' && (this.model() as ClientSearchResultVm).id === value) {
            return;
        }

        this.search.getById(value).subscribe({
            next: (c) => {
                if (this.selectedId === value) {
                    this.model.set(c);
                }
            },
            error: () => this.model.set(null)
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
}
