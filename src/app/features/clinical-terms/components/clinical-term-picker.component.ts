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
import { ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { appendClinicalTermToText, clinicalTermNameKey } from '@/app/features/clinical-terms/utils/clinical-term-text.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const PAGE_SIZE = 20;

const PLACEHOLDERS: Record<ClinicalTermKind, string> = {
    Complaint: 'Şikâyet sözlüğünde ara ve ekle…',
    Diagnosis: 'Tanı sözlüğünde ara ve ekle…'
};

interface SearchResult {
    active: ClinicalTermDto[];
    inactive: ClinicalTermDto[];
}

/**
 * Serbest metin alanının yanında sözlükten arayarak ekleme (ADR-020 S3). Seçilen terimin adı `control` metnine eklenir;
 * alan serbest metin olarak kalır. `ClinicalTerms.Read` yoksa veya alan kilitliyse (ör. kesinleşmiş muayene) hiçbir şey çizilmez.
 * Bulunamayan terimi `ClinicalTerms.Create` izni olan, salt okunur olmayan kiracıdaki kullanıcı sözlüğe ekleyip alana yazabilir.
 * Pasif eşleşmeler seçilemez; listenin altında "Pasif" olarak gösterilir. `ClinicalTerms.Deactivate` izni olan kullanıcı
 * "Etkinleştir" ile terimi etkinleştirir ve ad, seçilmiş gibi alana yazılır. Aynı adlı pasif kayıt varken "sözlüğe ekle"
 * sunulmaz (sunucu `409 DuplicateName` döner).
 */
@Component({
    selector: 'app-clinical-term-picker',
    standalone: true,
    imports: [FormsModule, AutoCompleteModule, ButtonModule, AppStatusTagComponent],
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
                                <span>Sözlükte {{ inactiveMatches().length ? 'aktif terim ' : '' }}bulunamadı.</span>
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
                    <ng-template #footer>
                        @if (inactiveMatches().length && !searchError()) {
                            <ul class="list-none m-0 px-3 py-2 border-t border-surface" data-testid="clinical-term-inactive">
                                @for (t of inactiveMatches(); track t.id) {
                                    <li class="flex flex-wrap items-center gap-x-2 gap-y-1 py-1" data-testid="clinical-term-inactive-row">
                                        <span class="text-muted-color">{{ t.name }}</span>
                                        <app-status-tag label="Pasif" severity="warn" />
                                        @if (canActivate()) {
                                            <p-button
                                                type="button"
                                                label="Etkinleştir"
                                                [text]="true"
                                                size="small"
                                                styleClass="p-0"
                                                [loading]="activatingId() === t.id"
                                                [disabled]="activatingId() !== null"
                                                data-testid="clinical-term-activate"
                                                (onClick)="activate(t)"
                                            />
                                        } @else if (!canDeactivate) {
                                            <small class="text-muted-color">Etkinleştirmek için yöneticiye başvurun.</small>
                                        }
                                    </li>
                                }
                            </ul>
                        }
                    </ng-template>
                </p-autocomplete>
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
    readonly canDeactivate = this.auth.hasOperationClaim(CLINICAL_TERMS_DEACTIVATE_CLAIM);

    readonly query = signal<ClinicalTermDto | string | null>(null);
    readonly lastQuery = signal('');
    /** Seçilebilir (aktif) sonuçlar. */
    readonly suggestions = signal<ClinicalTermDto[]>([]);
    /** Aynı aramanın pasif eşleşmeleri; seçilemez, yalnız etkinleştirilebilir. */
    readonly inactiveMatches = signal<ClinicalTermDto[]>([]);
    readonly searchError = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly adding = signal(false);
    readonly activatingId = signal<string | null>(null);

    private readonly term$ = new Subject<string>();

    constructor() {
        this.term$
            .pipe(
                switchMap((term) => this.load(term)),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe(({ active, inactive }) => {
                this.inactiveMatches.set(inactive);
                this.suggestions.set(active);
            });
    }

    placeholder(): string {
        return PLACEHOLDERS[this.kind()];
    }

    /**
     * Yalnız aranmış, sınır içindeki bir metin eklenebilir; salt okunur kiracıda yazma yok.
     * Aynı adlı pasif kayıt varsa ekleme yerine etkinleştirme yolu sunulur.
     */
    canAdd(): boolean {
        const name = this.lastQuery().trim();
        return this.canCreate && !this.ro.mutationBlocked() && !!name && name.length <= CLINICAL_TERM_NAME_MAX && !this.hasInactiveNamesake(name);
    }

    canActivate(): boolean {
        return this.canDeactivate && !this.ro.mutationBlocked();
    }

    onComplete(event: AutoCompleteCompleteEvent): void {
        const term = event.query ?? '';
        this.lastQuery.set(term);
        this.searchError.set(null);
        this.actionError.set(null);
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
        this.actionError.set(null);
        this.terms.create(this.kind(), this.lastQuery()).subscribe({
            next: (created) => {
                this.adding.set(false);
                this.write(created.name);
            },
            error: (e: unknown) => {
                this.adding.set(false);
                this.actionError.set(e instanceof Error ? e.message : 'Terim sözlüğe eklenemedi.');
            }
        });
    }

    /** Pasif terimi etkinleştirir (yönetim ekranıyla aynı uç) ve adını, seçilmiş gibi alana yazar. */
    activate(term: ClinicalTermDto): void {
        if (!this.canActivate() || term.isActive || this.activatingId() !== null) {
            return;
        }
        this.activatingId.set(term.id);
        this.actionError.set(null);
        this.terms.setActive(term.id, true).subscribe({
            next: () => {
                this.activatingId.set(null);
                this.write(term.name);
            },
            error: (e: unknown) => {
                this.activatingId.set(null);
                this.actionError.set(e instanceof Error ? e.message : 'Terim etkinleştirilemedi.');
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
        this.inactiveMatches.set([]);
    }

    private hasInactiveNamesake(name: string): boolean {
        const key = clinicalTermNameKey(name);
        return this.inactiveMatches().some((t) => clinicalTermNameKey(t.name) === key);
    }

    private load(term: string) {
        return this.terms.list({ kind: this.kind(), search: term, includeInactive: true, page: 1, pageSize: PAGE_SIZE }).pipe(
            map(
                (r): SearchResult => ({
                    active: r.items.filter((t) => t.isActive),
                    inactive: r.items.filter((t) => !t.isActive)
                })
            ),
            catchError((e: unknown) => {
                this.searchError.set(panelHttpFailureMessage(e, 'Sözlük yüklenemedi.'));
                return of<SearchResult>({ active: [], inactive: [] });
            })
        );
    }
}
