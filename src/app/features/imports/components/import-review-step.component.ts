import { Component, computed, effect, ElementRef, inject, input, model, output, signal, untracked, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { map, Observable, of } from 'rxjs';
import { BreedsService } from '@/app/entities/breed/services/breeds.service';
import { ImportOutcomeBarComponent } from '@/app/features/imports/components/import-outcome-bar.component';
import type {
    ImportBatchDto,
    ImportFileFormat,
    ImportPetCandidateDto,
    ImportPreviewDto,
    ImportRowDto,
    ImportRowsQuery,
    ImportRowStatusFilter,
    ImportTable,
    ImportUnmappedValueDto,
    ImportValueKind
} from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import { IMPORT_ROW_STATUS_LABELS, IMPORT_VALUE_KIND_LABELS, importErrorCode, importErrorMessage, importIssueDetail, importIssueLabel, importRowPlace, reminderEmailTotal } from '@/app/features/imports/utils/import-labels.utils';
import {
    fileBlockers,
    formatCount,
    IMPORT_OUTCOME_LABELS,
    importableText,
    type ImportOutcome,
    type ImportReviewReason,
    issueReasons,
    notImportedReasons,
    requiredValues,
    reviewHeadline,
    reviewState,
    reviewTables,
    reviewTotals
} from '@/app/features/imports/utils/import-review.utils';
import { fieldLabel, IMPORT_TABLE_LABELS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { ambiguousPetNos, IMPORT_PET_MERGE_PREFIX, IMPORT_VALUE_SKIP, type ImportValueChoices, petCandidateLabel, valueChoiceKey } from '@/app/features/imports/utils/import-value-mapping.utils';
import { PetColorsService } from '@/app/entities/pet/services/pet-colors.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/entities/vaccine-definition/services/vaccine-definitions.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

const ROW_PAGE_SIZE = 25;

/** Katlanan ayrıntı bölümleri. */
type Section = 'import' | 'skip' | 'error' | 'attention' | 'info' | 'optional' | 'rows';

/** Sonuç noktalarının rengi; oran çubuğuyla aynı. */
const OUTCOME_DOT: Readonly<Record<ImportOutcome | 'attention' | 'info', string>> = {
    import: 'bg-primary',
    skip: 'bg-surface-300 dark:bg-surface-600',
    error: 'bg-amber-500',
    attention: 'bg-sky-500',
    info: 'bg-surface-300 dark:bg-surface-600'
};

/**
 * Adım 3: kuru çalıştırma sonucu. Hiçbir kayıt oluşmamıştır.
 * Üstte tek cümlelik sonuç ve oran çubuğu, hemen altında sizden beklenen seçimler; ayrıntılar (nedenler, hatırlatma, satırlar) katlanır.
 */
@Component({
    selector: 'app-import-review-step',
    standalone: true,
    imports: [NgTemplateOutlet, FormsModule, ButtonModule, MessageModule, Paginator, SelectModule, AppEmptyStateComponent, AppStatusTagComponent, ImportOutcomeBarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (preview(); as p) {
            <!-- Sonuç -->
            <section class="rounded-border border p-4 sm:p-6 mb-4" [class]="tone().frame" [attr.role]="state() === 'failed' || state() === 'blocked' ? 'alert' : null" data-testid="import-review-summary">
                <div class="flex items-start gap-3 sm:gap-4">
                    <span class="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" [class]="tone().badge"><i class="text-xl" [class]="tone().icon" aria-hidden="true"></i></span>
                    <div class="min-w-0 flex-1">
                        <h2 class="m-0 text-xl sm:text-2xl font-semibold" data-testid="import-review-title">{{ headline().title }}</h2>
                        <p class="m-0 mt-1 text-muted-color">{{ headline().text }}</p>
                    </div>
                </div>

                @if (blockers().length) {
                    <ul class="list-none p-0 m-0 mt-4 flex flex-col gap-2" data-testid="import-blockers">
                        @for (b of blockers(); track b.code) {
                            <li class="rounded-border bg-surface-0 dark:bg-surface-900 border border-surface p-3">
                                <div class="font-medium">{{ b.label }}</div>
                                @if (b.note) {
                                    <div class="text-sm text-muted-color">{{ b.note }}</div>
                                }
                            </li>
                        }
                    </ul>
                }

                @if (totals().total > 0 && p.status !== 'ValidationFailed') {
                    <app-import-outcome-bar class="mt-5" [importable]="totals().importable" [skipped]="totals().skipped" [errors]="totals().errors" />
                    <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 m-0 mt-3" data-testid="import-review-totals">
                        @for (o of outcomes(); track o.key) {
                            <div class="flex sm:block items-center justify-between gap-3">
                                <dt class="min-w-0">
                                    <span class="flex items-center gap-2 text-sm text-muted-color"><span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot[o.key]"></span>{{ o.label }}</span>
                                    @if (o.hint && o.value > 0) {
                                        <span class="block sm:hidden text-xs text-muted-color pl-[1.125rem]">{{ o.hint }}</span>
                                    }
                                </dt>
                                <dd class="m-0 text-xl sm:text-2xl font-semibold tabular-nums shrink-0">{{ n(o.value) }}</dd>
                                @if (o.hint && o.value > 0) {
                                    <dd class="m-0 hidden sm:block text-sm text-muted-color">{{ o.hint }}</dd>
                                }
                            </div>
                        }
                    </dl>
                }
            </section>

            <!-- Sizden beklenen -->
            @if (required().length) {
                <section class="rounded-border border-2 border-amber-500 p-4 sm:p-5 mb-4" aria-labelledby="import-required-title" data-testid="import-required-values">
                    <h3 id="import-required-title" class="m-0 text-lg font-semibold">Sizden beklenen: {{ required().length }} seçim</h3>
                    <p class="m-0 mt-1 mb-4 text-sm text-muted-color">Bu tür ve aşı adları sistemde yok ya da kayıtların aynı adlı hastalardan hangisine ait olduğu ayırt edilemedi. Karşılığını seçin; aktarılmasını istemediğiniz için "Atla" deyin.</p>
                    <ul class="list-none p-0 m-0 flex flex-col gap-3">
                        @for (u of required(); track u.kind + '|' + u.source) {
                            <ng-container *ngTemplateOutlet="valueRow; context: { $implicit: u }" />
                        }
                    </ul>
                    @if (canManage()) {
                        <div class="flex flex-wrap items-center gap-3 mt-4">
                            <button pButton type="button" [disabled]="!hasChoices() || busy()" (click)="applyValues.emit()" data-testid="import-apply-values">
                                <i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Seçimleri uygula
                            </button>
                            <span class="text-sm text-muted-color">{{ pendingRequired() > 0 ? pendingRequired() + ' değer seçim bekliyor.' : 'Uygulayınca sonuç yeniden hesaplanır.' }}</span>
                        </div>
                    }
                </section>
            }

            <!-- Ayrıntılar -->
            <div class="rounded-border border border-surface divide-y divide-surface-200 dark:divide-surface-700 mb-4">
                @if (totals().importable > 0) {
                    <details #importSection [open]="isOpen('import')" (toggle)="setOpen('import', importSection.open)" data-testid="import-importable">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.import"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Aktarılacak {{ n(totals().importable) }} kayıt</span>
                                <span class="block text-sm text-muted-color">{{ importableText() }}</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4">
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm border-collapse">
                                    <thead>
                                        <tr class="text-left text-muted-color">
                                            <th scope="col" class="font-medium py-1.5 pr-3">Tablo</th>
                                            <th scope="col" class="font-medium py-1.5 px-3 text-right">Dosyada</th>
                                            <th scope="col" class="font-medium py-1.5 px-3 text-right">Aktarılacak</th>
                                            <th scope="col" class="font-medium py-1.5 px-3 text-right">Atlanacak</th>
                                            <th scope="col" class="font-medium py-1.5 pl-3 text-right">Aktarılamayacak</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (t of tables(); track t.key) {
                                            <tr class="border-t border-surface">
                                                <th scope="row" class="py-1 pr-3 text-left font-medium">
                                                    @if (p.payloadPurged) {
                                                        {{ t.label }}
                                                    } @else {
                                                        <button
                                                            type="button"
                                                            class="p-0 border-0 bg-transparent text-primary font-medium cursor-pointer text-left hover:underline underline-offset-2"
                                                            [attr.aria-label]="t.label + ': satırları göster'"
                                                            (click)="showTableRows(t.key)"
                                                        >
                                                            {{ t.label }}
                                                        </button>
                                                    }
                                                </th>
                                                <td class="py-1.5 px-3 text-right tabular-nums text-muted-color">{{ n(t.total) }}</td>
                                                <td class="py-1.5 px-3 text-right tabular-nums font-medium">{{ n(t.importable) }}</td>
                                                <td class="py-1.5 px-3 text-right tabular-nums">{{ t.skipped ? n(t.skipped) : '–' }}</td>
                                                <td class="py-1.5 pl-3 text-right tabular-nums" [class]="t.errors ? 'text-amber-700 dark:text-amber-400 font-medium' : ''">{{ t.errors ? n(t.errors) : '–' }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <p class="m-0 mt-2 text-sm text-muted-color">
                                @if (totals().matched > 0) {
                                    Bunların {{ n(totals().matched) }} tanesi sistemde zaten olan kayıtla eşleşir; yenisi açılmaz.
                                }
                                @if (!p.payloadPurged) {
                                    Satırlarını görmek için tablo adına tıklayın.
                                }
                            </p>
                        </div>
                    </details>
                }

                @if (totals().skipped > 0) {
                    <details #skipSection [open]="isOpen('skip')" (toggle)="setOpen('skip', skipSection.open)" data-testid="import-skipped">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.skip"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Bilerek atlanacak {{ n(totals().skipped) }} satır</span>
                                <span class="block text-sm text-muted-color">Kayıp değil: boş, tekrar eden ya da sizin atladığınız satırlar.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4">
                            <ng-container *ngTemplateOutlet="reasonList; context: { $implicit: skippedReasons(), tone: 'skip' }" />
                            @if (!p.payloadPurged) {
                                <div class="flex flex-wrap items-center gap-2 mt-3">
                                    <ng-container *ngTemplateOutlet="downloadButtons; context: { skipped: true, label: 'Atlananları indir (Excel)' }" />
                                </div>
                            }
                        </div>
                    </details>
                }

                @if (totals().errors > 0) {
                    <details #errorSection [open]="isOpen('error')" (toggle)="setOpen('error', errorSection.open)" data-testid="import-errors">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.error"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Aktarılamayacak {{ n(totals().errors) }} satır</span>
                                <span class="block text-sm text-muted-color">Bilgisi eksik ya da tutarsız. Listesini indirip eski programda düzeltebilirsiniz; aktarmayı engellemez.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4">
                            <ng-container *ngTemplateOutlet="reasonList; context: { $implicit: errorReasons(), tone: 'error' }" />
                            @if (!p.payloadPurged) {
                                <div class="flex flex-wrap items-center gap-2 mt-3">
                                    <ng-container *ngTemplateOutlet="downloadButtons; context: { skipped: false, label: 'Listeyi indir (Excel)' }" />
                                </div>
                            }
                        </div>
                    </details>
                }

                @if (attention().length) {
                    <details #attentionSection [open]="isOpen('attention')" (toggle)="setOpen('attention', attentionSection.open)" data-testid="import-attention">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.attention"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Aktarılacak, {{ n(attentionCount()) }} satırda bir alan boş ya da düzeltilmiş gelecek</span>
                                <span class="block text-sm text-muted-color">Kayıt gelir; geçersiz telefon, vergi no gibi alanlar boş kalır. Göz atmanız önerilir.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4"><ng-container *ngTemplateOutlet="reasonList; context: { $implicit: attention(), tone: 'attention' }" /></div>
                    </details>
                }

                @if (info().length) {
                    <details #infoSection [open]="isOpen('info')" (toggle)="setOpen('info', infoSection.open)" data-testid="import-info">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.info"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Bilgi notları</span>
                                <span class="block text-sm text-muted-color">Bir şey yapmanız gerekmez.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4"><ng-container *ngTemplateOutlet="reasonList; context: { $implicit: info(), tone: 'info' }" /></div>
                    </details>
                }

                @if (optional().length) {
                    <details #optionalSection [open]="isOpen('optional')" (toggle)="setOpen('optional', optionalSection.open)" data-testid="import-optional-values">
                        <summary [class]="summaryClass">
                            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" [class]="dot.info"></span>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">{{ optional().length }} ırk ve renk adı yazıldığı gibi gelecek</span>
                                <span class="block text-sm text-muted-color">İsteğe bağlı: listedeki karşılığına bağlamak isterseniz açın.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4">
                            <ul class="list-none p-0 m-0 flex flex-col gap-3">
                                @for (u of optional(); track u.kind + '|' + u.source) {
                                    <ng-container *ngTemplateOutlet="valueRow; context: { $implicit: u }" />
                                }
                            </ul>
                            @if (canManage() && !required().length) {
                                <button pButton type="button" class="mt-4" [disabled]="!hasChoices() || busy()" (click)="applyValues.emit()">
                                    <i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Seçimleri uygula
                                </button>
                            }
                        </div>
                    </details>
                }

                @if (p.summary.vaccinations.total > 0 || p.summary.appointments.total > 0) {
                    <section class="p-4 flex items-start gap-3" data-testid="import-reminders">
                        <i class="pi pi-bell-slash text-muted-color mt-1" aria-hidden="true"></i>
                        <div class="min-w-0 flex-1">
                            <div class="font-medium">Hatırlatmalar kapalı gelir</div>
                            <div class="text-sm text-muted-color">Bu aktarma yüzünden kimseye kendiliğinden e-posta gitmez. İsterseniz aktarma bitince sayıyı görerek siz açarsınız.</div>
                            <details class="mt-1 text-sm">
                                <summary class="cursor-pointer select-none text-primary font-medium">Sayıları göster</summary>
                                <ul class="m-0 mt-2 pl-5 flex flex-col gap-1">
                                    @if (p.summary.vaccinations.total > 0) {
                                        <li>
                                            {{ n(p.reminderImpact.vaccinationsWithFutureDueDate) }} ileri tarihli aşının hatırlatması kapalı bekler; {{ n(p.reminderImpact.vaccinationsWithPastDueDate) }} aşının tarihi geçtiği için hatırlatma üretmez.
                                        </li>
                                    }
                                    @if (p.summary.appointments.total > 0) {
                                        <li>{{ n(p.reminderImpact.futureAppointments ?? 0) }} gelecek randevunun hatırlatması kapalı bekler; geçmiş randevular aktarılmaz.</li>
                                    }
                                    <li>Bugün açsaydınız {{ n(emailsNow()) }} e-posta giderdi.</li>
                                    @if (!p.reminderImpact.tenantRemindersEnabled) {
                                        <li>Kliniğinizde aşı hatırlatması kapalı; açılana kadar aşı e-postası gitmez.</li>
                                    }
                                    @if (p.summary.appointments.total > 0 && p.reminderImpact.tenantAppointmentRemindersEnabled === false) {
                                        <li>Kliniğinizde randevu hatırlatması kapalı; açılana kadar randevu e-postası gitmez.</li>
                                    }
                                </ul>
                            </details>
                        </div>
                    </section>
                }

                @if (!p.payloadPurged) {
                    <details #rowsSection [open]="isOpen('rows')" (toggle)="setOpen('rows', rowsSection.open)" data-testid="import-rows">
                        <summary [class]="summaryClass">
                            <i class="pi pi-list text-muted-color" aria-hidden="true"></i>
                            <span class="flex-1 min-w-0">
                                <span class="block font-medium">Satır satır incele</span>
                                <span class="block text-sm text-muted-color">Dosyadaki her satırın ne olacağını tek tek görün.</span>
                            </span>
                            <i class="pi pi-angle-down text-muted-color" aria-hidden="true"></i>
                        </summary>
                        <div class="px-4 pb-4">
                            <div class="flex flex-wrap items-center gap-2 mb-3">
                                <p-select
                                    [options]="tableOptions"
                                    [ngModel]="tableFilter()"
                                    (ngModelChange)="setTable($event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tüm tablolar"
                                    [showClear]="true"
                                    class="w-full sm:w-44"
                                    ariaLabel="Tablo filtresi"
                                />
                                <p-select
                                    [options]="statusOptions"
                                    [ngModel]="statusFilter()"
                                    (ngModelChange)="setStatus($event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tüm sonuçlar"
                                    [showClear]="true"
                                    class="w-full sm:w-56"
                                    ariaLabel="Sonuç filtresi"
                                />
                                @if (codeFilter()) {
                                    <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="filterByCode(null)"><i class="p-button-icon pi pi-times"></i>{{ issueLabel(codeFilter()!) }}</button>
                                }
                            </div>
                            @if (statusFilter() === 'WillSkip' && codeFilter()) {
                                <div class="flex flex-wrap items-center gap-2 mb-3" data-testid="import-skipped-download">
                                    <span class="text-sm text-muted-color">Bu nedenle atlanacak satırları dosyadaki değerleriyle indirip eski programla karşılaştırabilirsiniz:</span>
                                    <ng-container *ngTemplateOutlet="downloadButtons; context: { skipped: true, label: 'Atlananları indir (Excel)', code: codeFilter() }" />
                                </div>
                            }

                            @if (rowsError()) {
                                <p-message severity="error" class="w-full" role="alert">{{ rowsError() }}</p-message>
                            } @else if (rowsLoading() && rows().length === 0) {
                                <p class="text-muted-color">Satırlar yükleniyor…</p>
                            } @else if (rows().length === 0) {
                                <app-empty-state message="Bu filtreye uyan satır yok." />
                            } @else {
                                <ul class="list-none p-0 m-0 flex flex-col gap-2" [class.opacity-60]="rowsLoading()" [attr.aria-busy]="rowsLoading()">
                                    @for (r of rows(); track r.table + r.rowNumber) {
                                        <li class="rounded-border border border-surface p-3">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="font-medium">{{ rowPlace(r.table, r.rowNumber, batch().sourceProfile) }}</span>
                                                <app-status-tag [label]="rowStatusLabel(r)" [severity]="rowStatusSeverity(r)" />
                                                @if (r.validation.action === 'Match') {
                                                    <span class="text-sm text-muted-color">Mevcut kayıtla eşleşecek</span>
                                                }
                                            </div>
                                            @if (r.issues.length) {
                                                <ul class="m-0 mt-2 pl-5 text-sm">
                                                    @for (i of r.issues; track i.code + i.field) {
                                                        <li>
                                                            <span class="font-medium">{{ issueLabel(i.code, i.message) }}</span>
                                                            @if (i.field) {
                                                                <span class="text-muted-color"> ({{ fieldLabel(r.table, i.field) }})</span>
                                                            }
                                                            @if (issueDetail(i.code, i.message); as d) {
                                                                <span class="block text-muted-color" data-testid="import-issue-detail">{{ d }}</span>
                                                            }
                                                        </li>
                                                    }
                                                </ul>
                                            }
                                            <details class="mt-2 text-sm">
                                                <summary class="cursor-pointer text-muted-color">Dosyadaki satır</summary>
                                                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 mb-0">
                                                    @for (kv of sourceEntries(r); track kv[0]) {
                                                        <div class="min-w-0">
                                                            <dt class="inline text-muted-color">{{ kv[0] }}:</dt>
                                                            <dd class="inline m-0 break-words">{{ kv[1] }}</dd>
                                                        </div>
                                                    }
                                                </dl>
                                            </details>
                                        </li>
                                    }
                                </ul>
                                <p-paginator [rows]="pageSize" [first]="(page() - 1) * pageSize" [totalRecords]="totalRows()" (onPageChange)="onPage($event)" />
                            }
                        </div>
                    </details>
                }
            </div>

            @if (p.payloadPurged) {
                <p-message severity="info" class="w-full mb-4">Satır verisi saklama süresi sonunda silindi; yalnızca sayılar görüntülenebilir.</p-message>
            }

            <!-- Neden listesi: kısa ad, tek cümle açıklama, satır sayısı; tıklanınca o nedenin satırları açılır. -->
            <ng-template #reasonList let-reasons let-tone="tone">
                <ul class="list-none p-0 m-0 flex flex-col" data-testid="import-reason-list">
                    @for (r of asReasons(reasons); track r.code) {
                        <li class="border-b border-surface last:border-b-0">
                            <button
                                type="button"
                                class="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 bg-transparent border-0 text-left text-color rounded-border"
                                [class]="p.payloadPurged ? 'cursor-default' : 'cursor-pointer hover:bg-emphasis'"
                                [class.bg-emphasis]="codeFilter() === r.code"
                                [disabled]="p.payloadPurged"
                                [attr.aria-label]="'Satırları göster: ' + r.label"
                                (click)="showReasonRows(tone, r)"
                            >
                                <span class="inline-block w-2 h-2 rounded-full shrink-0" [class]="dotOf(tone)"></span>
                                <span class="flex-1 min-w-0">
                                    <span class="block font-medium">{{ r.label }}</span>
                                    @if (r.note) {
                                        <span class="block text-sm text-muted-color">{{ r.note }}</span>
                                    }
                                </span>
                                <span class="shrink-0 tabular-nums font-medium">{{ n(r.rowCount) }}</span>
                                @if (!p.payloadPurged) {
                                    <i class="pi pi-angle-right text-muted-color shrink-0" aria-hidden="true"></i>
                                }
                            </button>
                        </li>
                    }
                </ul>
            </ng-template>

            <ng-template #downloadButtons let-skipped="skipped" let-label="label" let-code="code">
                <button pButton type="button" size="small" severity="secondary" [disabled]="!!reportBusy()" (click)="downloadReport('xlsx', skipped, code)">
                    <i class="p-button-icon" [class]="reportBusy() === 'xlsx' ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>{{ label }}
                </button>
                <button pButton type="button" size="small" severity="secondary" [text]="true" [disabled]="!!reportBusy()" (click)="downloadReport('csv', skipped, code)">
                    <i class="p-button-icon" [class]="reportBusy() === 'csv' ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>CSV
                </button>
            </ng-template>

            <!-- Karşılığı seçilecek değer: liste ya da "Atla". -->
            <ng-template #valueRow let-u>
                <li class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <div class="min-w-0 md:w-5/12">
                        <div class="flex items-baseline gap-2 min-w-0">
                            <span class="text-xs font-semibold uppercase tracking-wide text-muted-color shrink-0">{{ kindLabel(u) }}</span>
                            <span class="font-semibold break-words min-w-0">{{ valueTitle(u) }}</span>
                        </div>
                        <div class="text-sm text-muted-color">{{ valueRowsText(u) }}</div>
                    </div>
                    <div class="flex items-center gap-2 md:flex-1 min-w-0">
                        @if (isSkipped(u)) {
                            <div class="flex-1 min-w-0 rounded-border border border-surface px-3 py-2 text-sm text-muted-color" data-testid="import-value-skipped">Atlanacak; bu satırlar aktarılmaz.</div>
                            @if (canManage()) {
                                <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="setChoice(u, null)">Geri al</button>
                            }
                        } @else {
                            <p-select
                                class="flex-1 min-w-0"
                                [options]="catalogOptions(u)"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Karşılığını seçin"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                appendTo="body"
                                [disabled]="!canManage()"
                                [loading]="isCatalogLoading(u)"
                                [ngModel]="choices()[choiceKey(u)] || null"
                                (ngModelChange)="setChoice(u, $event)"
                                [ariaLabel]="valueTitle(u) + ' için karşılık'"
                            />
                            @if (canManage()) {
                                <button pButton type="button" size="small" severity="secondary" [outlined]="true" class="shrink-0" (click)="setChoice(u, skip)" [attr.aria-label]="valueTitle(u) + ': atla'">Atla</button>
                            }
                        }
                    </div>
                </li>
            </ng-template>
        }
    `
})
export class ImportReviewStepComponent {
    private readonly imports = inject(ImportsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly vaccineService = inject(VaccineDefinitionsService);
    private readonly breedsService = inject(BreedsService);
    private readonly colorsService = inject(PetColorsService);

    readonly batch = input.required<ImportBatchDto>();
    readonly preview = input.required<ImportPreviewDto | null>();
    readonly canManage = input(false);
    readonly busy = input(false);
    readonly choices = model.required<ImportValueChoices>();
    readonly applyValues = output<void>();

    private readonly rowsSection = viewChild<ElementRef<HTMLElement>>('rowsSection');

    protected readonly pageSize = ROW_PAGE_SIZE;
    protected readonly rowPlace = importRowPlace;
    protected readonly n = formatCount;
    protected readonly dot = OUTCOME_DOT;
    protected readonly skip = IMPORT_VALUE_SKIP;
    protected readonly summaryClass = 'flex items-center gap-3 p-4 cursor-pointer select-none list-none hover:bg-emphasis [&::-webkit-details-marker]:hidden';
    protected readonly tableOptions = IMPORT_TABLES.map((t) => ({ value: t, label: IMPORT_TABLE_LABELS[t] }));
    protected readonly statusOptions = (['Error', 'WillSkip', 'Warning', 'Valid'] as const).map((value) => ({ value, label: IMPORT_ROW_STATUS_LABELS[value] }));

    protected readonly tableFilter = signal<ImportTable | null>(null);
    protected readonly statusFilter = signal<ImportRowStatusFilter | null>(null);
    protected readonly codeFilter = signal<string | null>(null);
    protected readonly page = signal(1);
    protected readonly rows = signal<ImportRowDto[]>([]);
    protected readonly totalRows = signal(0);
    protected readonly rowsLoading = signal(false);
    protected readonly rowsError = signal<string | null>(null);
    protected readonly reportBusy = signal<ImportFileFormat | null>(null);
    private readonly open = signal<ReadonlySet<Section>>(new Set());

    protected readonly catalogs = signal<Partial<Record<ImportValueKind, SelectOption[]>>>({});
    protected readonly catalogLoading = signal<Partial<Record<ImportValueKind, boolean>>>({});
    protected readonly hasChoices = computed(() => Object.keys(this.choices()).length > 0);

    protected readonly tables = computed(() => (this.preview() ? reviewTables(this.preview()!) : []));
    protected readonly totals = computed(() => reviewTotals(this.tables()));
    protected readonly importableText = computed(() => importableText(this.tables()));
    protected readonly required = computed(() => (this.preview() ? requiredValues(this.preview()!) : []));
    protected readonly optional = computed(() => (this.preview()?.unmappedValues ?? []).filter((u) => !u.blocking));
    protected readonly pendingRequired = computed(() => this.required().filter((u) => !this.choices()[this.choiceKey(u)]).length);
    protected readonly blockers = computed(() => (this.preview() ? fileBlockers(this.preview()!) : []));
    protected readonly skippedReasons = computed(() => (this.preview() ? notImportedReasons(this.preview()!, 'Skipped') : []));
    protected readonly errorReasons = computed(() => (this.preview() ? notImportedReasons(this.preview()!, 'Error') : []));
    protected readonly attention = computed(() => (this.preview() ? issueReasons(this.preview()!, 'Warning') : []));
    protected readonly attentionCount = computed(() => this.attention().reduce((a, r) => a + r.rowCount, 0));
    protected readonly info = computed(() => (this.preview() ? issueReasons(this.preview()!, 'Info') : []));
    protected readonly state = computed(() => (this.preview() ? reviewState(this.preview()!, this.totals()) : 'past'));
    protected readonly headline = computed(() => reviewHeadline(this.state(), this.totals(), this.required().length));
    protected readonly emailsNow = computed(() => (this.preview() ? reminderEmailTotal(this.preview()!.reminderImpact) : 0));

    protected readonly outcomes = computed(() => [
        { key: 'import' as const, label: IMPORT_OUTCOME_LABELS.import, value: this.totals().importable, hint: '' },
        { key: 'skip' as const, label: IMPORT_OUTCOME_LABELS.skip, value: this.totals().skipped, hint: 'Boş ya da tekrar; kayıp değil.' },
        { key: 'error' as const, label: IMPORT_OUTCOME_LABELS.error, value: this.totals().errors, hint: 'Bilgisi eksik; düzeltilebilir.' }
    ]);

    protected readonly tone = computed(() => {
        switch (this.state()) {
            case 'ready':
            case 'readyWithNotes':
                return { frame: 'border-primary bg-primary-50 dark:bg-primary-950/40', badge: 'bg-primary text-primary-contrast', icon: 'pi pi-check' };
            case 'needsChoice':
                return { frame: 'border-surface bg-surface-50 dark:bg-surface-800', badge: 'bg-amber-500 text-white', icon: 'pi pi-pencil' };
            case 'past':
                return { frame: 'border-surface bg-surface-50 dark:bg-surface-800', badge: 'bg-surface-200 dark:bg-surface-700 text-color', icon: 'pi pi-history' };
            default:
                return { frame: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30', badge: 'bg-amber-500 text-white', icon: 'pi pi-exclamation-triangle' };
        }
    });

    constructor() {
        // Önizleme yenilenince (ilk yükleme ve yeniden doğrulama) satırlar ve katalog seçenekleri de yenilenir.
        effect(() => {
            if (this.preview()) {
                untracked(() => {
                    this.page.set(1);
                    this.loadRows();
                    this.loadCatalogs();
                });
            }
        });
    }

    protected issueLabel = importIssueLabel;
    protected issueDetail = importIssueDetail;
    /** Sorun alanı API anahtarıdır (`HayvanAdi`); kullanıcıya eşleme ekranındaki etiket gösterilir (ADR-022). */
    protected fieldLabel = fieldLabel;

    protected isOpen(s: Section): boolean {
        return this.open().has(s);
    }

    protected setOpen(s: Section, open: boolean): void {
        if (open === this.isOpen(s)) {
            return;
        }

        this.open.update((cur) => {
            const next = new Set(cur);

            if (open) {
                next.add(s);
            } else {
                next.delete(s);
            }

            return next;
        });
    }

    /** Şablon bağlamı tipsiz geldiği için neden listesine tipli erişim. */
    protected asReasons(reasons: unknown): ImportReviewReason[] {
        return reasons as ImportReviewReason[];
    }

    protected dotOf(tone: keyof typeof OUTCOME_DOT): string {
        return OUTCOME_DOT[tone];
    }

    /** Ortak satır şablonu (`ng-template`) değeri tipsiz aldığı için alanlara tipli yardımcıyla erişilir. */
    protected kindLabel(u: ImportUnmappedValueDto): string {
        return IMPORT_VALUE_KIND_LABELS[u.kind];
    }

    protected valueRowsText(u: ImportUnmappedValueDto): string {
        return u.kind === 'pet' ? `${formatCount(u.rowCount)} aşı / muayene kaydı hangisine ait?` : `${formatCount(u.rowCount)} satırda`;
    }

    protected isCatalogLoading(u: ImportUnmappedValueDto): boolean {
        return !!this.catalogLoading()[u.kind];
    }

    protected choiceKey(u: ImportUnmappedValueDto): string {
        return valueChoiceKey(u.kind, u.source);
    }

    protected isSkipped(u: ImportUnmappedValueDto): boolean {
        return this.choices()[this.choiceKey(u)] === IMPORT_VALUE_SKIP;
    }

    /** Karşılık listesi; atlamak için satırdaki "Atla" düğmesi kullanılır. */
    protected catalogOptions(u: ImportUnmappedValueDto): SelectOption[] {
        if (u.kind === 'pet') {
            const candidates = this.petCandidates(u);

            return [
                ...candidates.map((c) => ({ label: petCandidateLabel(c), value: c.petNo })),
                ...candidates.map((c) => ({ label: `İkisi aynı hayvan: tek hasta say (${c.name ?? 'Adsız'}, E-vet ${c.petNo} olarak)`, value: IMPORT_PET_MERGE_PREFIX + c.petNo }))
            ];
        }

        return this.catalogs()[u.kind] ?? [];
    }

    /** Değer satırının başlığı; belirsiz hasta grubunda "<sahip>: '<ad>' adlı N hasta" sorusu (sözleşme 13.4). */
    protected valueTitle(u: ImportUnmappedValueDto): string {
        if (u.kind !== 'pet') {
            return u.source;
        }

        const candidates = this.petCandidates(u);
        const first = candidates[0];

        return first ? `${first.ownerName ?? 'Sahip'}: '${first.name ?? ''}' adlı ${candidates.length} hasta` : u.source;
    }

    private petCandidates(u: ImportUnmappedValueDto): ImportPetCandidateDto[] {
        const all = this.preview()?.petCandidates ?? [];

        return ambiguousPetNos(u.source)
            .map((no) => all.find((c) => c.petNo === no))
            .filter((c): c is ImportPetCandidateDto => !!c);
    }

    protected setChoice(u: ImportUnmappedValueDto, target: string | null): void {
        const key = this.choiceKey(u);

        this.choices.update((cur) => {
            const next = { ...cur };

            if (target) {
                next[key] = target;
            } else {
                delete next[key];
            }

            return next;
        });
    }

    protected setTable(v: ImportTable | null): void {
        this.tableFilter.set(v);
        this.resetPage();
    }

    protected setStatus(v: ImportRowStatusFilter | null): void {
        this.statusFilter.set(v);
        this.resetPage();
    }

    protected filterByCode(code: string | null): void {
        this.codeFilter.set(this.codeFilter() === code ? null : code);
        this.resetPage();
    }

    /** "Aktarılacak" tablosunda tablo adı: o tablonun bütün satırları listelenir. */
    protected showTableRows(table: ImportTable): void {
        this.showRows(table, null, null);
    }

    /** Nedene tıklanınca o nedenin satırları; neden tek tablodaysa o tabloyla sınırlanır. */
    protected showReasonRows(tone: 'skip' | 'error' | 'attention' | 'info', reason: ImportReviewReason): void {
        const status: Record<typeof tone, ImportRowStatusFilter | null> = { skip: 'WillSkip', error: 'Error', attention: 'Warning', info: null };

        this.showRows(reason.tables.length === 1 ? reason.tables[0] : null, status[tone], reason.code);
    }

    private showRows(table: ImportTable | null, status: ImportRowStatusFilter | null, code: string | null): void {
        this.tableFilter.set(table);
        this.statusFilter.set(status);
        this.codeFilter.set(code);
        this.setOpen('rows', true);
        this.resetPage();
        setTimeout(() => this.rowsSection()?.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
    }

    protected onPage(e: PaginatorState): void {
        this.page.set((e.page ?? 0) + 1);
        this.loadRows();
    }

    protected rowStatusLabel(r: ImportRowDto): string {
        const status = r.validation.status;

        if (status !== 'Error' && r.validation.action === 'Skip') {
            return IMPORT_ROW_STATUS_LABELS.WillSkip;
        }

        return status === 'Error' || status === 'Warning' || status === 'Valid' ? IMPORT_ROW_STATUS_LABELS[status] : 'Bekliyor';
    }

    /** Renkler sonuç noktalarıyla aynı: aktarılamayacak turuncu, atlanacak gri, göz atılacak mavi, aktarılacak yeşil. */
    protected rowStatusSeverity(r: ImportRowDto): StatusTagSeverity {
        if (r.validation.status === 'Error') {
            return 'warn';
        }

        if (r.validation.action === 'Skip') {
            return 'secondary';
        }

        return r.validation.status === 'Warning' ? 'info' : 'success';
    }

    protected sourceEntries(r: ImportRowDto): [string, string][] {
        return Object.entries(r.source ?? {}).map(([k, v]) => [k, v ?? ''] as [string, string]);
    }

    /** Aktarılamayacak satırların listesi; `skipped` ile bilerek atlanacak satırlar (`code` verilirse yalnız o neden). */
    protected downloadReport(format: ImportFileFormat, skipped = false, code: string | null = null): void {
        this.reportBusy.set(format);
        this.imports.downloadErrorReport(this.batch().id, format, skipped ? { code } : undefined).subscribe({
            next: (res) => {
                this.reportBusy.set(null);
                saveDownload(res, skipped ? `vetinity-iceaktar-atlananlar.${format}` : `vetinity-iceaktar-hatalar.${format}`);
            },
            error: (e: unknown) => {
                this.reportBusy.set(null);
                this.rowsError.set(importErrorMessage(e, 'Liste indirilemedi.'));
            }
        });
    }

    private resetPage(): void {
        this.page.set(1);
        this.loadRows();
    }

    private loadRows(): void {
        if (this.preview()?.payloadPurged) {
            return;
        }

        const query: ImportRowsQuery = {
            page: this.page(),
            pageSize: ROW_PAGE_SIZE,
            table: this.tableFilter() ?? undefined,
            status: this.statusFilter() ?? undefined,
            code: this.codeFilter() ?? undefined
        };

        this.rowsLoading.set(true);
        this.rowsError.set(null);
        this.imports.getRows(this.batch().id, query).subscribe({
            next: (res) => {
                this.rows.set(res.items);
                this.totalRows.set(res.totalItems);
                this.rowsLoading.set(false);
            },
            error: (e: unknown) => {
                this.rows.set([]);
                this.rowsLoading.set(false);
                this.rowsError.set(importErrorCode(e) === 'Imports.PayloadPurged' ? 'Satır verisi saklama süresi sonunda silindi.' : importErrorMessage(e, 'Satırlar yüklenemedi.'));
            }
        });
    }

    /** Eşlenemeyen değerlerin türlerine ait katalog listeleri bir kez yüklenir. */
    private loadCatalogs(): void {
        const kinds = new Set((this.preview()?.unmappedValues ?? []).map((u) => u.kind).filter((k) => k !== 'pet'));

        for (const kind of kinds) {
            if (this.catalogs()[kind] || this.catalogLoading()[kind]) {
                continue;
            }

            this.catalogLoading.update((cur) => ({ ...cur, [kind]: true }));
            this.catalogSource(kind).subscribe({
                next: (options) => {
                    this.catalogs.update((cur) => ({ ...cur, [kind]: options }));
                    this.catalogLoading.update((cur) => ({ ...cur, [kind]: false }));
                },
                error: () => this.catalogLoading.update((cur) => ({ ...cur, [kind]: false }))
            });
        }
    }

    private catalogSource(kind: ImportValueKind): Observable<SelectOption[]> {
        switch (kind) {
            case 'species':
                return this.speciesService.getSpeciesList({ activeOnly: true }).pipe(map((list) => list.map((s) => ({ label: s.name, value: s.id }))));
            case 'vaccine':
                return this.vaccineService.getVaccineDefinitions().pipe(map((res) => res.items.map((v) => ({ label: v.name, value: v.id }))));
            case 'breed':
                return this.breedsService.getBreedList({ activeOnly: true }).pipe(map((list) => list.map((b) => ({ label: `${b.speciesName} · ${b.name}`, value: b.id }))));
            case 'color':
                return this.colorsService.getPetColors();
            case 'pet':
                return of([]);
        }
    }
}
