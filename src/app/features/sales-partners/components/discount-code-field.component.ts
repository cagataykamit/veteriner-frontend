import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, distinctUntilChanged, map, of, Subject, switchMap, timer } from 'rxjs';
import type { DiscountCodeValidationDto } from '@/app/features/sales-partners/models/sales-partner.model';
import { DiscountCodesService } from '@/app/features/sales-partners/services/discount-codes.service';
import {
    DISCOUNT_CODE_INVALID_MESSAGE,
    discountNoteText,
    normalizeDiscountCodeInput
} from '@/app/features/sales-partners/utils/discount-code.utils';

export type DiscountCodeFieldStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'error';

const MIN_LENGTH = 3;
const DEBOUNCE_MS = 600;

/**
 * İsteğe bağlı "Ortak kodu" alanı (ADR-037): yazarken anlık doğrular, geçerliyse indirim notunu, değilse tek tip hata metnini
 * gösterir. Kayıt ve abonelik akışı ortak kullanır; sunucu kodu yine yeniden doğrular.
 */
@Component({
    selector: 'app-discount-code-field',
    standalone: true,
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="flex flex-col gap-1">
            <label [for]="inputId()" class="block text-surface-900 dark:text-surface-0 font-medium mb-1">Ortak kodu <span class="text-muted-color font-normal">(isteğe bağlı)</span></label>
            <input
                pInputText
                [id]="inputId()"
                type="text"
                class="w-full uppercase"
                autocomplete="off"
                maxlength="40"
                [disabled]="disabled()"
                [ngModel]="code()"
                (ngModelChange)="onInput($event)"
                (blur)="validateNow()"
                [attr.aria-invalid]="status() === 'invalid' || null"
                [attr.aria-describedby]="inputId() + '-status'"
                data-testid="discount-code-input"
            />
            <small [id]="inputId() + '-status'" aria-live="polite" data-testid="discount-code-status">
                @switch (status()) {
                    @case ('checking') {
                        <span class="text-muted-color">Kod kontrol ediliyor…</span>
                    }
                    @case ('valid') {
                        <span class="text-green-700 dark:text-green-400 font-medium">{{ note() }}</span>
                    }
                    @case ('invalid') {
                        <span class="text-red-500">{{ invalidMessage }}</span>
                    }
                    @case ('error') {
                        <span class="text-red-500">{{ errorMessage() }}</span>
                    }
                }
            </small>
        </div>
    `
})
export class DiscountCodeFieldComponent implements OnInit {
    readonly inputId = input('discountCode');
    readonly disabled = input(false);
    readonly code = model('');
    /** Geçerli doğrulama sonucu ya da `null` (boş/geçersiz/kontrol ediliyor). */
    readonly validated = output<DiscountCodeValidationDto | null>();

    readonly status = signal<DiscountCodeFieldStatus>('idle');
    readonly note = signal('');
    readonly errorMessage = signal('');
    readonly invalidMessage = DISCOUNT_CODE_INVALID_MESSAGE;

    private readonly codes = inject(DiscountCodesService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly changes = new Subject<{ value: string; immediate: boolean }>();
    private lastChecked: string | null = null;

    ngOnInit(): void {
        this.changes
            .pipe(
                switchMap(({ value, immediate }) => (immediate ? of(value) : timer(DEBOUNCE_MS).pipe(map(() => value)))),
                distinctUntilChanged(),
                switchMap((value) => this.check(value)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        if (this.code()) {
            this.onInput(this.code());
            this.validateNow();
        }
    }

    onInput(raw: string): void {
        const value = normalizeDiscountCodeInput(raw);

        this.code.set(value);

        if (value !== this.lastChecked) {
            this.validated.emit(null);
        }

        if (value.length < MIN_LENGTH) {
            this.lastChecked = null;
            this.status.set(value ? 'invalid' : 'idle');
            this.changes.next({ value: '', immediate: true });

            return;
        }

        this.status.set('checking');
        this.changes.next({ value, immediate: false });
    }

    validateNow(): void {
        const value = this.code();

        if (value.length >= MIN_LENGTH && value !== this.lastChecked) {
            this.changes.next({ value, immediate: true });
        }
    }

    private check(value: string) {
        if (!value) {
            return of(null);
        }

        this.status.set('checking');

        return this.codes.validate(value).pipe(
            map((result) => {
                this.lastChecked = value;

                if (result.valid && result.discountPercent !== null && result.discountMonths !== null) {
                    this.note.set(discountNoteText(result.discountPercent, result.discountMonths));
                    this.status.set('valid');
                    this.validated.emit(result);
                } else {
                    this.status.set('invalid');
                    this.validated.emit(null);
                }

                return result;
            }),
            catchError((err: unknown) => {
                this.lastChecked = null;
                this.errorMessage.set(
                    err instanceof HttpErrorResponse && err.status === 429
                        ? 'Çok fazla deneme yapıldı; biraz sonra tekrar deneyin.'
                        : 'Kod şu an doğrulanamadı; kayıt sırasında yeniden denetlenecek.'
                );
                this.status.set('error');
                this.validated.emit(null);

                return of(null);
            })
        );
    }
}
