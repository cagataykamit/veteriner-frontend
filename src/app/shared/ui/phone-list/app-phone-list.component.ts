import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDayMonthYearDisplay, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Açılan satırdaki etiket–değer; boş değer (`null`, boş metin, "—") hiç yazılmaz. */
export interface PhoneListField {
    readonly label: string;
    readonly value: string | null | undefined;
}

/** Açılan satırdaki yazılı eylem: bağlantı (`link`) ya da düğme (`run`). */
export interface PhoneListAction {
    readonly label: string;
    readonly icon?: string;
    readonly link?: readonly unknown[] | string;
    readonly queryParams?: Params;
    readonly run?: () => void;
    readonly danger?: boolean;
    readonly disabled?: boolean;
    readonly testId?: string;
}

/** Telefon listesinin bir kaydı; sayfa kendi satırından kurar. */
export interface PhoneListItem {
    readonly id: string;
    /** Gün başlığının kaynağı (UTC an); verilmezse liste başlıksızdır (ör. müşteriler). */
    readonly at?: string | null;
    /** Satırın solunda kısa bilgi: saat ("14:30") ya da baş harfler. */
    readonly lead?: string | null;
    readonly title: string;
    /** Başlığın yanında soluk ek ("· Boncuk"). */
    readonly titleNote?: string | null;
    /** İkinci satır (açıklama, yöntem…); boşsa yazılmaz. */
    readonly sub?: string | null;
    /** Sağdaki tutar; gün toplamına girer. */
    readonly amount?: number | null;
    readonly status?: { readonly label: string; readonly severity: StatusTagSeverity } | null;
    readonly fields: readonly PhoneListField[];
    /** "Ayrıntı" düğmesi (kaydın sayfası). */
    readonly detailLink?: readonly unknown[] | null;
    readonly actions?: readonly PhoneListAction[];
}

interface PhoneListGroup {
    readonly key: string;
    readonly label: string | null;
    readonly items: readonly PhoneListItem[];
    readonly total: number | null;
    /** Sayfa sınırındaki gün: önceki ya da sonraki sayfada aynı günün kaydı olabilir, toplam yalnız bu sayfanınkidir. */
    readonly partial: boolean;
}

const isEmpty = (v: string | null | undefined) => v == null || v.trim() === '' || v.trim() === '—';

/**
 * Telefon liste şablonu (G-04, seçenek B): kayıtlar gün başlığı altında (kayıt sayısı ve tutarlı listelerde gün toplamıyla) ince
 * satırlar; satıra dokununca altında dolu alanlar ve yazılı eylem düğmeleri açılır, aynı anda tek satır açıktır. Boş alan yazılmaz.
 * Gün toplamı yüklü sayfadan hesaplanır: sayfa sınırındaki günde (listenin başı önceki sayfadan, sonu sonraki sayfadan devam
 * edebiliyorsa) toplamın yanına "bu sayfada" yazılır. Gruplama ardışık kayıtlar üzerindendir; liste tarihe göre sıralı olmalıdır.
 */
@Component({
    selector: 'app-phone-list',
    standalone: true,
    imports: [RouterLink, ButtonModule, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 overflow-hidden" data-testid="phone-list">
            @for (g of groups(); track g.key) {
                @if (g.label) {
                    <div class="flex items-baseline gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 text-sm" data-testid="phone-list-day">
                        <span class="font-semibold">{{ g.label }}</span>
                        <span class="text-xs text-muted-color">{{ g.items.length }} kayıt</span>
                        @if (g.total !== null) {
                            <span class="ml-auto text-right tabular-nums">
                                @if (g.partial) {
                                    <span class="text-xs text-muted-color" title="Aynı günün diğer kayıtları başka sayfada olabilir">bu sayfada </span>
                                }
                                <b>{{ money(g.total) }}</b>
                            </span>
                        }
                    </div>
                }
                @for (item of g.items; track item.id) {
                    @let open = openId() === item.id;
                    <button
                        type="button"
                        class="w-full flex items-center gap-3 min-h-(--touch-target) px-3 py-2 text-left border-0 border-b border-surface-200 dark:border-surface-700 cursor-pointer text-color"
                        [class]="open ? 'bg-primary-50 dark:bg-primary-400/10' : 'bg-transparent'"
                        [attr.aria-expanded]="open"
                        [attr.aria-controls]="'phoneRow-' + item.id"
                        (click)="toggle(item.id)"
                        data-testid="phone-list-row"
                    >
                        @if (item.lead) {
                            <span class="shrink-0 min-w-[2.75rem] text-sm text-muted-color tabular-nums">{{ item.lead }}</span>
                        }
                        <span class="flex-1 min-w-0">
                            <span class="block truncate font-medium"
                                >{{ item.title }}
                                @if (shown(item.titleNote); as note) {
                                    <span class="font-normal text-muted-color">· {{ note }}</span>
                                }
                            </span>
                            @if (shown(item.sub); as sub) {
                                <span class="block truncate text-sm text-muted-color">{{ sub }}</span>
                            }
                        </span>
                        @if (item.amount != null || item.status) {
                            <span class="shrink-0 flex flex-col items-end gap-1">
                                @if (item.amount != null) {
                                    <b class="tabular-nums">{{ money(item.amount) }}</b>
                                }
                                @if (item.status; as s) {
                                    <app-status-tag [label]="s.label" [severity]="s.severity" />
                                }
                            </span>
                        }
                        <i class="pi text-xs text-muted-color" [class]="open ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
                    </button>
                    @if (open) {
                        <div [id]="'phoneRow-' + item.id" class="px-3 pt-2 pb-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800" data-testid="phone-list-detail">
                            @if (filled(item).length > 0) {
                                <dl class="m-0 grid grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                                    @for (f of filled(item); track f.label) {
                                        <dt class="text-muted-color">{{ f.label }}</dt>
                                        <dd class="m-0 min-w-0 break-words">{{ f.value }}</dd>
                                    }
                                </dl>
                            }
                            <div class="flex flex-wrap gap-2 mt-3">
                                @if (item.detailLink) {
                                    <a pButton [routerLink]="item.detailLink" data-testid="phone-list-open"><i class="p-button-icon pi pi-arrow-right"></i>Ayrıntı</a>
                                }
                                @for (a of item.actions ?? []; track a.label) {
                                    @if (a.link && !a.disabled) {
                                        <a pButton severity="secondary" [outlined]="true" [routerLink]="a.link" [queryParams]="a.queryParams ?? null" [attr.data-testid]="a.testId ?? null">
                                            @if (a.icon) {
                                                <i class="p-button-icon" [class]="a.icon"></i>
                                            }
                                            {{ a.label }}
                                        </a>
                                    } @else {
                                        <button pButton type="button" [severity]="a.danger ? 'danger' : 'secondary'" [outlined]="true" [disabled]="!!a.disabled" (click)="a.run?.()" [attr.data-testid]="a.testId ?? null">
                                            @if (a.icon) {
                                                <i class="p-button-icon" [class]="a.icon"></i>
                                            }
                                            {{ a.label }}
                                        </button>
                                    }
                                }
                            </div>
                        </div>
                    }
                }
            }
        </div>
    `
})
export class AppPhoneListComponent {
    readonly items = input.required<readonly PhoneListItem[]>();
    /** Gün başlığında günün tutar toplamı (yalnız tutarlı listelerde). */
    readonly dayTotals = input(false);
    /** Listenin ilk günü önceki sayfadan devam ediyor olabilir (ilk sayfa değil). */
    readonly continuesBefore = input(false);
    /** Listenin son günü sonraki sayfada devam ediyor olabilir (son sayfa değil). */
    readonly continuesAfter = input(false);
    readonly currency = input('TRY');

    readonly openId = signal<string | null>(null);

    readonly groups = computed<PhoneListGroup[]>(() => {
        const runs: { key: string; at: string | null; items: PhoneListItem[] }[] = [];

        for (const item of this.items()) {
            const key = item.at ? toIstanbulDateInputValue(item.at) : '';
            const last = runs[runs.length - 1];

            if (last && last.key === key) {
                last.items.push(item);
            } else {
                runs.push({ key, at: item.at ?? null, items: [item] });
            }
        }

        return runs.map((run, i) => ({
            key: `${i}:${run.key}`,
            label: run.at ? formatDayMonthYearDisplay(run.at) : null,
            items: run.items,
            total: this.dayTotals() && run.at ? run.items.reduce((sum, it) => sum + (it.amount ?? 0), 0) : null,
            partial: (i === 0 && this.continuesBefore()) || (i === runs.length - 1 && this.continuesAfter())
        }));
    });

    toggle(id: string): void {
        this.openId.set(this.openId() === id ? null : id);
    }

    /** Satırdaki ek metin: boş ya da "—" ise yazılmaz (G-04). */
    shown(value: string | null | undefined): string | null {
        return isEmpty(value) ? null : value!;
    }

    filled(item: PhoneListItem): PhoneListField[] {
        return item.fields.filter((f) => !isEmpty(f.value));
    }

    money(amount: number): string {
        return formatMoney(amount, this.currency());
    }
}
