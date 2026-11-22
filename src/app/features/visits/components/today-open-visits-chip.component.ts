import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import type { Subscription } from 'rxjs';
import type { OpenItemVisitKind, OpenItemVisitVm, OpenItemVisitsVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { careStatusLabel } from '@/app/entities/visit/utils/visit-status.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Satırın ücret ekleme adresi: ücret en son muayeneye bağlanır, böylece önceki günün ziyareti de "ücret yok"tan çıkar. */
export function chargeLinkParams(row: OpenItemVisitVm): Record<string, string> {
    return {
        clientId: row.clientId,
        petId: row.petId,
        visitId: row.visitId,
        ...(row.latestExaminationId ? { examinationId: row.latestExaminationId } : {})
    };
}

/**
 * "Açık işler" şeridinde liste sayfası olmayan sayının çipi (ücret yok, önceki günden açık geliş). Tıklanınca küçük panel
 * sayının arkasındaki ziyaretleri yükler (`OPEN_ITEMS_API_CONTRACT.md` §10, her açılışta taze); satır işin yapılacağı yere götürür:
 * ücret yok → ücret ekleme, açık geliş → Tamamla (devam ediyor) ya da geliş düzeltmesi (hiç başlamamış).
 */
@Component({
    selector: 'app-today-open-visits-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonModule, PopoverModule],
    template: `
        <button
            type="button"
            class="inline-flex items-center gap-1 rounded-border border px-2 py-0.5 text-sm cursor-pointer bg-transparent touch:min-h-(--touch-target)"
            [class]="tone()"
            [attr.title]="title()"
            aria-haspopup="dialog"
            [attr.aria-expanded]="open()"
            (click)="panel.toggle($event)"
            [attr.data-testid]="'open-items-chip-' + kind()"
        >
            <i [class]="icon()" aria-hidden="true"></i>{{ text() }}
            <i class="pi text-[0.65rem]" [class]="open() ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
        </button>

        <p-popover #panel styleClass="w-[28rem] max-w-[calc(100vw-2rem)]" (onShow)="onShow()" (onHide)="open.set(false)">
            <div role="dialog" [attr.aria-labelledby]="titleId()" [attr.data-testid]="'open-items-panel-' + kind()">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span [id]="titleId()" class="font-semibold">{{ heading() }}</span>
                    @if (data(); as d) {
                        <span class="text-xs text-muted-color">{{ d.totalCount }} geliş</span>
                    }
                </div>
                <p class="m-0 mb-1 text-xs text-muted-color">{{ hint() }}</p>

                @if (loading()) {
                    <p class="m-0 py-3 text-sm text-muted-color"><i class="pi pi-spin pi-spinner mr-1" aria-hidden="true"></i>Yükleniyor…</p>
                } @else if (error(); as message) {
                    <p class="m-0 py-3 text-sm text-red-700 dark:text-red-300" role="alert">{{ message }}</p>
                } @else if (data(); as d) {
                    @if (d.items.length === 0) {
                        <p class="m-0 py-3 text-sm text-muted-color">Açık kayıt kalmadı.</p>
                    } @else {
                        <ul class="list-none m-0 p-0 max-h-80 overflow-y-auto flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                            @for (r of d.items; track r.visitId) {
                                <li class="flex items-center gap-3 py-2" data-testid="open-items-row">
                                    <span class="flex-1 min-w-0 text-sm leading-tight">
                                        <span class="block truncate font-medium">{{ r.petName }} · {{ r.clientName }}</span>
                                        <span class="block truncate text-xs text-muted-color">{{ detail(r) }}</span>
                                    </span>
                                    @if (kind() === 'Uncharged') {
                                        @if (canAddCharge()) {
                                            <a pButton size="small" [text]="true" [routerLink]="chargeRoute" [queryParams]="chargeParams(r)" (click)="panel.hide()" data-testid="open-items-add-charge">Ücret ekle</a>
                                        }
                                        @if (canCompleteVisit() && r.careStatus === 'Completed') {
                                            <button pButton type="button" size="small" [text]="true" severity="secondary" title="Gerçekten ücretsiz bir gelişse listeden çıkar" (click)="panel.hide(); markNoCharge.emit(r)" data-testid="open-items-mark-no-charge">Ücretsiz</button>
                                        }
                                    } @else if (r.careStatus === 'InProgress' && canCompleteVisit()) {
                                        <button pButton type="button" size="small" [text]="true" (click)="panel.hide(); complete.emit(r)" data-testid="open-items-complete">Tamamla</button>
                                    } @else if (r.careStatus !== 'InProgress' && canCorrectVisit()) {
                                        <button pButton type="button" size="small" [text]="true" title="Tamamlandı ya da yanlış geliş olarak düzelt" (click)="panel.hide(); correct.emit(r)" data-testid="open-items-correct">Düzelt</button>
                                    }
                                </li>
                            }
                        </ul>
                        @if (d.totalCount > d.items.length) {
                            <p class="m-0 pt-2 text-xs text-muted-color">En eski {{ d.items.length }} geliş gösteriliyor.</p>
                        }
                    }
                }
            </div>
        </p-popover>
    `
})
export class TodayOpenVisitsChipComponent {
    private readonly visits = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly kind = input.required<OpenItemVisitKind>();
    readonly text = input.required<string>();
    readonly title = input('');
    readonly icon = input('');
    readonly tone = input('');
    /** Ücret oluşturma yetkisi var ve işletme salt okunur değil. */
    readonly canAddCharge = input(false);
    /** Devam eden gelişi tamamlama (`Visits.Update`) ve işletme salt okunur değil. */
    readonly canCompleteVisit = input(false);
    /** Hiç başlamamış gelişi düzeltme (`Visits.Correct`) ve işletme salt okunur değil. */
    readonly canCorrectVisit = input(false);
    /** Devam eden açık gelişi tamamla (Bugün'deki Tamamla ile aynı akış). */
    readonly complete = output<OpenItemVisitVm>();
    /** Hiç başlamamış açık gelişi düzeltme diyaloğunda kapat (Tamamlandı ya da yanlış geliş). */
    readonly correct = output<OpenItemVisitVm>();
    /** "Ücret yok" listesinde tamamlanmış gelişi bilinçli ücretsiz işaretle (onay sayfada sorulur). */
    readonly markNoCharge = output<OpenItemVisitVm>();

    readonly chargeRoute = '/panel/charges/new';
    readonly chargeParams = chargeLinkParams;
    readonly open = signal(false);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<OpenItemVisitsVm | null>(null);
    private loadSub?: Subscription;

    readonly titleId = computed(() => `openItemsPanelTitle-${this.kind()}`);
    readonly heading = computed(() => (this.kind() === 'Uncharged' ? 'Ücret kaydı olmayan gelişler' : 'Önceki günden açık gelişler'));
    readonly hint = computed(() => (this.kind() === 'Uncharged' ? 'Son 30 gün; işlem yapılmış, ücret yazılmamış. En eski önce.' : 'Bugünden önce gelmiş, tamamlanmamış. En eski önce.'));

    detail(r: OpenItemVisitVm): string {
        const parts = [formatUtcIsoAsLocalDateTimeDisplay(r.arrivedAtUtc)];

        if (this.kind() === 'Incomplete') {
            parts.push(careStatusLabel(r.careStatus));
        }

        if (r.responsibleVeterinarianName) {
            parts.push(r.responsibleVeterinarianName);
        }

        if ((r.chargeableWorkCount ?? 0) > 0) {
            parts.push(`${r.chargeableWorkCount} işlem`);
        }

        return parts.join(' · ');
    }

    /** Her açılışta yeniden yüklenir: sayı ile liste aynı anda okunur, kapatılan kayıt listede kalmaz. */
    onShow(): void {
        this.open.set(true);
        this.loadSub?.unsubscribe();
        this.loading.set(true);
        this.error.set(null);
        this.loadSub = this.visits
            .getOpenItemVisits(this.kind())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (d) => {
                    this.data.set(d);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.data.set(null);
                    this.error.set(panelHttpFailureMessage(e, 'Açık iş listesi yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }
}
