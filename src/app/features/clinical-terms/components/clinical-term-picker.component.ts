import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule } from '@angular/forms';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLINICAL_TERMS_CREATE_CLAIM,
    CLINICAL_TERMS_DEACTIVATE_CLAIM,
    CLINICAL_TERMS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { CLINICAL_TERM_NAME_MAX, type ClinicalTermDto, type ClinicalTermKind } from '@/app/features/clinical-terms/models/clinical-term.model';
import { ClinicalTermError, ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { appendClinicalTermToText, clinicalTermNameKey } from '@/app/features/clinical-terms/utils/clinical-term-text.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const PAGE_SIZE = 20;

const PLACEHOLDERS: Record<ClinicalTermKind, string> = {
    Complaint: 'Şikâyet sözlüğünde ara ve ekle…',
    Diagnosis: 'Tanı sözlüğünde ara ve ekle…'
};

/**
 * Serbest metin alanının yanında sözlükten arayarak ekleme (ADR-020 S3). Arama yalnız aktif terimleri getirir; seçilen
 * terimin adı `control` metnine eklenir, alan serbest metin olarak kalır. `ClinicalTerms.Read` yoksa veya alan kilitliyse
 * (ör. kesinleşmiş muayene) hiçbir şey çizilmez. Bulunamayan terimi `ClinicalTerms.Create` izni olan, salt okunur olmayan
 * kiracıdaki kullanıcı sözlüğe ekleyip alana yazabilir. Ad pasif bir kayıtla çakışırsa (`409 DuplicateName`) o kayıt
 * gösterilir; `ClinicalTerms.Deactivate` izni olan kullanıcı "Etkinleştir" ile etkinleştirip adı alana yazar.
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
                @if (inactiveNamesake(); as t) {
                    <div class="flex flex-wrap items-center gap-x-2" role="status" data-testid="clinical-term-inactive">
                        <small>‘{{ t.name }}’ sözlükte pasif olarak kayıtlı.</small>
                        @if (canActivate()) {
                            <p-button
                                type="button"
                                label="Etkinleştir"
                                [text]="true"
                                size="small"
                                styleClass="p-0"
                                [loading]="activating()"
                                data-testid="clinical-term-activate"
                                (onClick)="activate()"
                            />
                        } @else {
                            <small class="text-muted-color">Etkinleştirmek için yöneticiye başvurun.</small>
                        }
                    </div>
                }
                @if (actionError()) {
                    <small class="text-red-500 block" role="alert">{{ actionError() }}</small>
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
    private readonly canDeactivate = this.auth.hasOperationClaim(CLINICAL_TERMS_DEACTIVATE_CLAIM);

    readonly query = signal<ClinicalTermDto | string | null>(null);
    readonly lastQuery = signal('');
    readonly suggestions = signal<ClinicalTermDto[]>([]);
    readonly searchError = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly adding = signal(false);
    /** "Sözlüğe ekle"de adı çakışan pasif kayıt; etkinleştirilebilir. */
    readonly inactiveNamesake = signal<ClinicalTermDto | null>(null);
    readonly activating = signal(false);

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

    canActivate(): boolean {
        return this.canDeactivate && !this.ro.mutationBlocked();
    }

    onComplete(event: AutoCompleteCompleteEvent): void {
        const term = event.query ?? '';
        this.lastQuery.set(term);
        this.searchError.set(null);
        this.actionError.set(null);
        this.inactiveNamesake.set(null);
        this.term$.next(term);
    }

    onSelect(event: AutoCompleteSelectEvent): void {
        this.write((event.value as ClinicalTermDto).name);
    }

    addLastQuery(): void {
        if (!this.canAdd() || this.adding()) {
            return;
        }
        const name = this.lastQuery();
        this.adding.set(true);
        this.actionError.set(null);
        this.inactiveNamesake.set(null);
        this.terms.create(this.kind(), name).subscribe({
            next: (created) => {
                this.adding.set(false);
                this.write(created.name);
            },
            error: (e: unknown) => {
                if (e instanceof ClinicalTermError && e.isDuplicateName) {
                    this.showInactiveNamesake(name, e.message);
                    return;
                }
                this.adding.set(false);
                this.actionError.set(e instanceof Error ? e.message : 'Terim sözlüğe eklenemedi.');
            }
        });
    }

    /** Çakışan pasif terimi etkinleştirir (yönetim ekranıyla aynı uç) ve adını, seçilmiş gibi alana yazar. */
    activate(): void {
        const term = this.inactiveNamesake();
        if (!term || !this.canActivate() || this.activating()) {
            return;
        }
        this.activating.set(true);
        this.actionError.set(null);
        this.terms.setActive(term.id, true).subscribe({
            next: () => {
                this.activating.set(false);
                this.write(term.name);
            },
            error: (e: unknown) => {
                this.activating.set(false);
                this.actionError.set(e instanceof Error ? e.message : 'Terim etkinleştirilemedi.');
            }
        });
    }

    /**
     * Arama yalnız aktifleri getirdiğinden mükerrer ad çoğunlukla pasif bir kayıttır; o ada özel tek seferlik
     * `includeInactive` aramasıyla kayıt bulunur. Bulunamazsa sunucunun mükerrer mesajı gösterilir.
     */
    private showInactiveNamesake(name: string, duplicateMessage: string): void {
        const key = clinicalTermNameKey(name);
        this.terms.list({ kind: this.kind(), search: name, includeInactive: true, page: 1, pageSize: PAGE_SIZE }).subscribe({
            next: (r) => {
                this.adding.set(false);
                const namesake = r.items.find((t) => !t.isActive && clinicalTermNameKey(t.name) === key);
                if (namesake) {
                    this.inactiveNamesake.set(namesake);
                } else {
                    this.actionError.set(duplicateMessage);
                }
            },
            error: () => {
                this.adding.set(false);
                this.actionError.set(duplicateMessage);
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
        this.inactiveNamesake.set(null);
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
