import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule } from '@angular/forms';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_TERMS_CREATE_CLAIM, CLINICAL_TERMS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CLINICAL_TERM_NAME_MAX, type ClinicalTermDto, type ClinicalTermKind } from '@/app/features/clinical-terms/models/clinical-term.model';
import { ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { appendClinicalTermToText } from '@/app/features/clinical-terms/utils/clinical-term-text.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const PAGE_SIZE = 20;

const PLACEHOLDERS: Record<ClinicalTermKind, string> = {
    Complaint: 'Şikâyet sözlüğünde ara ve ekle…',
    Diagnosis: 'Tanı sözlüğünde ara ve ekle…'
};

/**
 * Serbest metin alanının yanında sözlükten arayarak ekleme (ADR-020 S3). Seçilen terimin adı `control` metnine eklenir;
 * alan serbest metin olarak kalır. `ClinicalTerms.Read` yoksa veya alan kilitliyse (ör. kesinleşmiş muayene) hiçbir şey çizilmez.
 * Bulunamayan terimi `ClinicalTerms.Create` izni olan, salt okunur olmayan kiracıdaki kullanıcı sözlüğe ekleyip alana yazabilir.
 */
@Component({
    selector: 'app-clinical-term-picker',
    standalone: true,
    imports: [FormsModule, AutoCompleteModule, ButtonModule],
    template: `
        @if (canRead && !control().disabled) {
            <div class="mt-2" data-testid="clinical-term-picker">
                <p-autocomplete
                    [inputId]="inputId()"
                    [ariaLabel]="placeholder()"
                    [ngModel]="query()"
                    (ngModelChange)="query.set($event)"
                    [suggestions]="suggestions()"
                    (completeMethod)="onComplete($event)"
                    (onSelect)="onSelect($event)"
                    optionLabel="name"
                    [delay]="300"
                    [minQueryLength]="1"
                    [dropdown]="true"
                    dropdownMode="blank"
                    [autoOptionFocus]="true"
                    [showEmptyMessage]="true"
                    [fluid]="true"
                    [placeholder]="placeholder()"
                    appendTo="body"
                >
                    <ng-template #empty>
                        <div class="py-1">
                            @if (searchError()) {
                                <span class="text-red-500" role="alert">{{ searchError() }}</span>
                            } @else {
                                <span>Sözlükte bulunamadı.</span>
                                @if (canAdd()) {
                                    <div>
                                        <p-button
                                            type="button"
                                            [label]="'‘' + lastQuery().trim() + '’ sözlüğe ekle'"
                                            icon="pi pi-plus"
                                            [text]="true"
                                            size="small"
                                            styleClass="p-0"
                                            [loading]="adding()"
                                            data-testid="clinical-term-add"
                                            (onClick)="addLastQuery()"
                                        />
                                    </div>
                                }
                            }
                        </div>
                    </ng-template>
                </p-autocomplete>
                @if (addError()) {
                    <small class="text-red-500 block" role="alert">{{ addError() }}</small>
                }
            </div>
        }
    `
})
export class ClinicalTermPickerComponent {
    readonly kind = input.required<ClinicalTermKind>();
    /** Seçilen adın yazılacağı serbest metin alanı (muayenede `visitReason` / `assessment`). */
    readonly control = input.required<FormControl<string>>();
    readonly inputId = input('');

    private readonly terms = inject(ClinicalTermsService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly canRead = this.auth.hasOperationClaim(CLINICAL_TERMS_READ_CLAIM);
    private readonly canCreate = this.auth.hasOperationClaim(CLINICAL_TERMS_CREATE_CLAIM);

    readonly query = signal<ClinicalTermDto | string | null>(null);
    readonly lastQuery = signal('');
    readonly suggestions = signal<ClinicalTermDto[]>([]);
    readonly searchError = signal<string | null>(null);
    readonly addError = signal<string | null>(null);
    readonly adding = signal(false);

    private readonly term$ = new Subject<string>();

    constructor() {
        this.term$
            .pipe(
                switchMap((term) => this.load(term)),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((items) => this.suggestions.set(items));
    }

    placeholder(): string {
        return PLACEHOLDERS[this.kind()];
    }

    /** Yalnız aranmış, sınır içindeki bir metin eklenebilir; salt okunur kiracıda yazma yok. */
    canAdd(): boolean {
        const name = this.lastQuery().trim();
        return this.canCreate && !this.ro.mutationBlocked() && !!name && name.length <= CLINICAL_TERM_NAME_MAX;
    }

    onComplete(event: AutoCompleteCompleteEvent): void {
        const term = event.query ?? '';
        this.lastQuery.set(term);
        this.searchError.set(null);
        this.addError.set(null);
        this.term$.next(term);
    }

    onSelect(event: AutoCompleteSelectEvent): void {
        this.write((event.value as ClinicalTermDto).name);
    }

    addLastQuery(): void {
        if (!this.canAdd() || this.adding()) {
            return;
        }
        this.adding.set(true);
        this.addError.set(null);
        this.terms.create(this.kind(), this.lastQuery()).subscribe({
            next: (created) => {
                this.adding.set(false);
                this.write(created.name);
            },
            error: (e: unknown) => {
                this.adding.set(false);
                this.addError.set(e instanceof Error ? e.message : 'Terim sözlüğe eklenemedi.');
            }
        });
    }

    /** Adı alana ekler; arama kutusu bir sonraki seçim için boşalır. */
    private write(name: string): void {
        const control = this.control();
        const next = appendClinicalTermToText(control.value, name);
        if (next !== control.value) {
            control.setValue(next);
            control.markAsDirty();
        }
        this.query.set(null);
        this.lastQuery.set('');
        this.suggestions.set([]);
    }

    private load(term: string) {
        return this.terms.list({ kind: this.kind(), search: term, page: 1, pageSize: PAGE_SIZE }).pipe(
            map((r) => r.items),
            catchError((e: unknown) => {
                this.searchError.set(panelHttpFailureMessage(e, 'Sözlük yüklenemedi.'));
                return of([] as ClinicalTermDto[]);
            })
        );
    }
}
