import { Component, DestroyRef, ElementRef, inject, input, model, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Tüm liste ekranlarının ortak arama kutusu (ürün kararı): yazdıkça arar (en az 2 karakter, 350 ms bekleme), Enter anında
 * arar, × temizler ve listeyi geri getirir; "Ara" düğmesi yoktur. Arama sunucu tarafındadır: sayfa `searchRequested` olayında listeyi
 * yeniden yükler. Tek karakterde (min. uzunluğun altında) otomatik arama yapılmaz; kutu boşalınca liste geri gelir.
 */
@Component({
    selector: 'app-search-input',
    standalone: true,
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="relative w-full">
            <input
                #field
                pInputText
                type="text"
                class="w-full pr-8"
                autocomplete="off"
                [attr.id]="inputId() || null"
                [attr.aria-label]="ariaLabel() || null"
                [placeholder]="placeholder()"
                [ngModel]="value()"
                (ngModelChange)="onType($event)"
                (keydown.enter)="onEnter($event)"
            />
            @if (value()) {
                <button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-muted-color hover:text-color bg-transparent border-0 cursor-pointer p-0"
                    aria-label="Aramayı temizle"
                    (click)="clear()"
                >
                    <i class="pi pi-times text-xs" aria-hidden="true"></i>
                </button>
            }
        </div>
    `
})
export class SearchInputComponent {
    readonly value = model('');
    readonly inputId = input('');
    readonly placeholder = input('Ara…');
    readonly ariaLabel = input('');
    readonly minLength = input(SEARCH_MIN_LENGTH);
    /** Sayfa listeyi yenilemelidir (otomatik, Enter veya temizleme). */
    readonly searchRequested = output<void>();

    private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
    private readonly typed$ = new Subject<void>();

    constructor() {
        this.typed$
            .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => this.searchRequested.emit());
    }

    onType(text: string): void {
        this.value.set(text);
        const length = text.trim().length;

        // Boşalınca listeyi geri getir; 1 karakterde (min. uzunluğun altında) bekle.
        if (length === 0 || length >= this.minLength()) {
            this.typed$.next();
        }
    }

    onEnter(event: Event): void {
        event.preventDefault();
        this.searchRequested.emit();
    }

    clear(): void {
        this.value.set('');
        this.searchRequested.emit();
        this.field().nativeElement.focus(); // temizledikten sonra yeniden yazılabilsin
    }
}
