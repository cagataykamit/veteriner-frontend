import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_DELETE_CLAIM, PETS_DELETE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { DeletableRecordKind, DeletedRecordRowVm } from '@/app/entities/record-deletion/models/record-deletion.model';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { type DeleteBlockLink, restoreErrorLink } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ListPageState } from '@/app/shared/list/list-page-state';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppListEmptyStateComponent } from '@/app/shared/ui/empty-state/app-list-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPhoneListComponent, type PhoneListAction, type PhoneListItem } from '@/app/shared/ui/phone-list/app-phone-list.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const VIEW_LABEL: Record<DeletableRecordKind, string> = { client: 'Müşteriler', pet: 'Hastalar' };
/** Adres çubuğundaki görünüm (`?tab=pets`); müşteriler varsayılan, parametre yazılmaz. */
const PET_TAB_PARAM = 'pets';

interface RestoreFeedback {
    readonly ok: boolean;
    readonly text: string;
    readonly link: DeleteBlockLink | null;
}

/**
 * Silinenler (ADR-054 K6), Müşteri ve Hasta > Silinenler: silinen müşteri ve hastalar, en son silinen önce; satırda "Geri yükle".
 * Görünüm izinle gelir (müşteride `Clients.Delete`, hastada `Pets.Delete`); ikisi de varsa üstte seçilir. Müşterisi silinmiş hasta
 * geri yüklenmez: satır müşteri kartına yönlendirir ("Önce müşteriyi geri yükleyin"). Geri yükleme çakışmasında çakışan müşteriye
 * bağlantı verilir. Telefonda ortak satır listesi (G-04), silinme gününe göre başlıklı.
 */
@Component({
    selector: 'app-deleted-records-page',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        Paginator,
        SelectButtonModule,
        TableModule,
        AppListHeaderComponent,
        AppListEmptyStateComponent,
        AppErrorStateComponent,
        AppLoadingStateComponent,
        AppPhoneListComponent,
        FilterFieldComponent,
        SearchInputComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            <div class="flex flex-col gap-4">
                <app-list-header class="pb-3 border-b border-surface-200 dark:border-surface-700" title="Silinenler" [count]="totalItems()">
                    <app-filter-field label="Arama" labelFor="deletedSearch" [active]="isSearchActive()" width="grow">
                        <app-search-input inputId="deletedSearch" [hint]="view() === 'client' ? 'Ad, e-posta, telefon' : 'Hasta adı, tür, ırk, mikroçip'" [(value)]="searchInput" (searchRequested)="applySearch()" />
                    </app-filter-field>
                    <button pButton type="button" actions severity="secondary" (click)="resetSearch()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                </app-list-header>

                <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                    @if (viewOptions.length > 1) {
                        <p-selectbutton [options]="viewOptions" optionLabel="label" optionValue="value" [ngModel]="view()" (ngModelChange)="setView($event)" [allowEmpty]="false" ariaLabel="Kayıt türü" data-testid="deleted-view" />
                    }
                    <p class="m-0 text-sm text-muted-color min-w-0 flex-1 basis-72">
                        Silinen kayıtlar listelerde ve hatırlatmalarda görünmez; geçmiş kayıtları korunur. Geri yüklenen kayıt eski yerine döner{{ view() === 'client' ? ', müşteriyle birlikte silinen hastalar da gelir' : '' }}.
                    </p>
                </div>

                @if (feedback(); as f) {
                    <p class="m-0 text-sm" [class.text-danger]="!f.ok" [attr.role]="f.ok ? 'status' : 'alert'" data-testid="restore-feedback">
                        <i class="pi mr-1.5" [class]="f.ok ? 'pi-check-circle text-primary' : 'pi-exclamation-circle'" aria-hidden="true"></i>{{ f.text }}
                        @if (f.link; as link) {
                            <a [routerLink]="link.route" class="text-primary font-medium no-underline whitespace-nowrap ml-1">{{ link.label }} →</a>
                        }
                    </p>
                }

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (initialLoad() && loading()) {
                    <app-loading-state message="Silinen kayıtlar yükleniyor…" />
                } @else if (rows().length === 0) {
                    <app-list-empty-state [filtered]="isSearchActive()" [emptyMessage]="view() === 'client' ? 'Silinen müşteri yok.' : 'Silinen hasta yok.'" (clear)="resetSearch()" />
                } @else {
                    <div class="hidden lg:block list-table">
                        <p-table
                            [value]="rows()"
                            [paginator]="true"
                            [rows]="pageSize()"
                            [rowsPerPageOptions]="list.rowsPerPageOptions"
                            [paginatorDropdownAppendTo]="'body'"
                            [totalRecords]="totalItems()"
                            [lazy]="true"
                            [first]="list.first()"
                            [loading]="loading()"
                            (onLazyLoad)="list.onTableLazyLoad($event)"
                            [tableStyle]="{ 'min-width': '50rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>{{ view() === 'client' ? 'Ad soyad' : 'Hasta' }}</th>
                                    @if (view() === 'client') {
                                        <th>İletişim</th>
                                    } @else {
                                        <th>Tür</th>
                                        <th>Müşteri</th>
                                    }
                                    <th>Silinme</th>
                                    <th>Silen</th>
                                    <th style="width: 14rem">İşlem</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr [attr.data-testid]="'deleted-row-' + row.id">
                                    <td class="font-medium"><a [routerLink]="cardLink(row)" class="text-primary no-underline">{{ row.title }}</a></td>
                                    <td>{{ row.detail ?? '—' }}</td>
                                    @if (view() === 'pet') {
                                        <td>
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary no-underline">{{ row.clientName ?? '—' }}</a>
                                                @if (row.clientDeleted) {
                                                    <span class="text-muted-color text-sm"> · silindi</span>
                                                }
                                            } @else {
                                                {{ row.clientName ?? '—' }}
                                            }
                                        </td>
                                    }
                                    <td class="whitespace-nowrap">{{ row.deletedAtUtc | trDateTime }}</td>
                                    <td>{{ row.deletedByUserName ?? '—' }}</td>
                                    <td>
                                        @if (row.clientDeleted && row.clientId) {
                                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary text-sm font-medium no-underline" data-testid="restore-client-first">Önce müşteriyi geri yükleyin →</a>
                                        } @else if (canRestore()) {
                                            <button pButton type="button" size="small" class="p-button-outlined" [disabled]="restoringId() !== null" (click)="restore(row)" [attr.data-testid]="'restore-' + row.id">
                                                <i [class]="restoringId() === row.id ? 'pi pi-spin pi-spinner' : 'pi pi-undo'"></i>Geri yükle
                                            </button>
                                        }
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>

                    <!-- Telefonda ortak satır listesi (G-04): silinme gününe göre başlıklı; dokununca alanlar ve "Geri yükle" açılır. -->
                    <app-phone-list class="lg:hidden" [items]="phoneItems()" />

                    <div class="lg:hidden mt-4">
                        <p-paginator
                            [rows]="pageSize()"
                            [totalRecords]="totalItems()"
                            [first]="list.first()"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            [rowsPerPageOptions]="list.rowsPerPageOptions"
                            (onPageChange)="list.onMobilePageChange($event)"
                        />
                    </div>
                }
            </div>
        </div>
    `
})
export class DeletedRecordsPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);
    private readonly records = inject(RecordDeletionService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);

    readonly copy = PANEL_COPY;

    /** Yetkili görünümler; rota en az birini garanti eder. */
    readonly viewOptions = (
        [
            ...(this.auth.hasOperationClaim(CLIENTS_DELETE_CLAIM) ? ['client'] : []),
            ...(this.auth.hasOperationClaim(PETS_DELETE_CLAIM) ? ['pet'] : [])
        ] as DeletableRecordKind[]
    ).map((value) => ({ value, label: VIEW_LABEL[value] }));

    readonly view = signal<DeletableRecordKind>(this.viewOptions[0]?.value ?? 'client');
    readonly activeSearch = signal('');
    searchInput = '';

    readonly list = new ListPageState<DeletedRecordRowVm>({
        fetch: (page, pageSize) => this.records.listDeleted(this.view(), { page, pageSize, search: this.activeSearch() || undefined }),
        loadKey: (page, pageSize) => `${this.view()}|${page}|${pageSize}|${this.activeSearch()}`,
        onLoaded: () => this.initialLoad.set(false)
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;
    readonly rows = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly pageSize = this.list.pageSize;
    readonly initialLoad = signal(true);

    readonly restoringId = signal<string | null>(null);
    readonly feedback = signal<RestoreFeedback | null>(null);
    /** Geri yükleme yazmadır: salt okunur kiracıda kapalı. */
    readonly canRestore = computed(() => !this.ro.mutationBlocked());

    readonly isSearchActive = computed(() => !!this.activeSearch());

    /** Telefon satırları (G-04): ad, müşteride iletişim / hastada tür · müşteri; boş alan yazılmaz. */
    readonly phoneItems = computed<PhoneListItem[]>(() =>
        this.rows().map((row) => ({
            id: row.id,
            at: row.deletedAtUtc,
            title: row.title,
            titleNote: row.kind === 'pet' ? row.clientName : null,
            sub: row.detail,
            status: row.clientDeleted ? { label: 'Müşterisi silindi', severity: 'secondary' } : null,
            fields: [
                { label: row.kind === 'client' ? 'İletişim' : 'Tür', value: row.detail },
                { label: 'Müşteri', value: row.kind === 'pet' ? row.clientName : null },
                { label: 'Silinme', value: formatUtcIsoAsLocalDateTimeDisplay(row.deletedAtUtc) },
                { label: 'Silen', value: row.deletedByUserName }
            ],
            detailLink: this.cardLink(row),
            actions: this.phoneActions(row)
        }))
    );

    ngOnInit(): void {
        const wantsPets = this.route.snapshot.queryParamMap.get('tab') === PET_TAB_PARAM;

        if (wantsPets && this.viewOptions.some((o) => o.value === 'pet')) {
            this.view.set('pet');
        }

        this.list.startInitialLoad();
    }

    readonly cardLink = (row: DeletedRecordRowVm): string[] => [row.kind === 'client' ? '/panel/clients' : '/panel/pets', row.id];

    setView(kind: DeletableRecordKind): void {
        if (kind === this.view()) {
            return;
        }

        this.view.set(kind);
        this.feedback.set(null);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: kind === 'pet' ? PET_TAB_PARAM : null }, queryParamsHandling: 'merge', replaceUrl: true });
        this.list.suppressNextTableLoad();
        this.list.loadFirstPage();
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.list.suppressNextTableLoad();
        this.list.loadFirstPage();
    }

    resetSearch(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.list.suppressNextTableLoad();
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.list.suppressNextTableLoad();
        this.list.reload();
    }

    restore(row: DeletedRecordRowVm): void {
        if (this.restoringId() !== null || !this.canRestore()) {
            return;
        }

        this.restoringId.set(row.id);
        this.feedback.set(null);
        this.records
            .restore(row.kind, row.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.restoringId.set(null);
                    this.feedback.set({
                        ok: true,
                        text: row.kind === 'client' ? `${row.title} ve onunla birlikte silinen hastaları geri yüklendi.` : `${row.title} geri yüklendi.`,
                        link: { label: 'Kartı aç', route: this.cardLink(row) }
                    });
                    this.reload();
                },
                error: (e: unknown) => {
                    this.restoringId.set(null);
                    this.feedback.set({ ok: false, text: e instanceof Error ? e.message : 'Kayıt geri yüklenemedi.', link: restoreErrorLink(e, row.clientId) });
                }
            });
    }

    private phoneActions(row: DeletedRecordRowVm): PhoneListAction[] {
        if (row.clientDeleted && row.clientId) {
            return [{ label: 'Önce müşteriyi geri yükleyin', icon: 'pi pi-user', link: ['/panel/clients', row.clientId], testId: 'restore-client-first' }];
        }

        return this.canRestore() ? [{ label: 'Geri yükle', icon: 'pi pi-undo', run: () => this.restore(row), disabled: this.restoringId() !== null, testId: `restore-${row.id}` }] : [];
    }
}
