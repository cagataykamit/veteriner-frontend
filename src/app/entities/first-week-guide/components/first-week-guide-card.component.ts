import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, linkedSignal, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '@/app/core/auth/auth.service';
import { FIRST_WEEK_GUIDE_ROLE_TITLES, firstWeekGuideRole, firstWeekGuideSteps, type FirstWeekGuideStep } from '@/app/entities/first-week-guide/utils/first-week-guide.steps';
import { FirstWeekGuideService, isFirstWeekGuideVisible } from '@/app/entities/first-week-guide/services/first-week-guide.service';

/**
 * Bugün ekranında rolüne göre "İlk hafta" karşılama afişi (TIER-022): solda marka renginde selam, sayaç ve ilerleme; sağda
 * sıradaki adım (ilk yapılmamış adım) ve altında adım hapları. Hapa tıklanan adım sağda açılır, oradan elle işaretlenir.
 * İlk görüldüğünden 14 gün kendiliğinden açılır; kapatılınca bir daha çıkmaz, kullanıcı menüsündeki "İlk hafta rehberi" ile
 * yeniden açılır. Rolü olmayan ya da adımı kalmayan kullanıcıda çizilmez.
 */
@Component({
    selector: 'app-first-week-guide-card',
    standalone: true,
    imports: [RouterLink, ButtonModule, TooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        /* Beyaz yazı: açıkta birincil 700 üstünde 6.9:1; koyuda birincil 900 (tema birincili koyuda açık tondur, beyaz yazı taşımaz). */
        .fwg-side {
            color: #ffffff;
            background-color: var(--p-primary-700);
            background-image: radial-gradient(circle at 110% -10%, rgb(255 255 255 / 0.14) 0 5.5rem, transparent 5.6rem), radial-gradient(circle at -10% 115%, rgb(255 255 255 / 0.08) 0 4.5rem, transparent 4.6rem);
        }
        :host-context(.app-dark) .fwg-side {
            background-color: var(--p-primary-900);
        }
        /* Genel başlık rengi (_typography) koyu zeminde okunmaz. */
        .fwg-side h2 {
            color: inherit;
        }
        .fwg-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.75rem 0.25rem 0.375rem;
            border-radius: 999px;
            border: 1px solid var(--p-content-border-color);
            background: transparent;
            color: var(--p-text-muted-color);
            font: inherit;
            font-size: 0.875rem;
            white-space: nowrap;
            cursor: pointer;
        }
        .fwg-chip > span:first-child {
            width: 1.375rem;
            height: 1.375rem;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: var(--p-content-hover-background);
            font-weight: 600;
        }
        .fwg-chip.is-done,
        .fwg-chip.is-selected {
            color: var(--p-text-color);
        }
        .fwg-chip.is-done > span:first-child {
            background: var(--p-primary-color);
            color: var(--p-primary-contrast-color);
        }
        .fwg-chip.is-selected {
            box-shadow: inset 0 0 0 1px var(--p-primary-color);
            font-weight: 600;
        }
        .fwg-chip.is-selected,
        .fwg-chip:hover {
            border-color: var(--p-primary-color);
        }
        .fwg-chip:focus-visible {
            outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
            outline-offset: var(--focus-ring-offset);
        }
        .fwg-close.fwg-close {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
        }
        @media (max-width: 991px) {
            /* Dar ekranda kapatma düğmesi renkli panelin üstüne düşer. */
            .fwg-close.fwg-close,
            .fwg-close.fwg-close.fwg-close:hover {
                color: #ffffff;
            }
            .fwg-close.fwg-close.fwg-close:hover {
                background: rgb(255 255 255 / 0.16);
            }
        }
        @media (max-width: 575px) {
            .fwg-chip {
                min-height: var(--touch-target);
                padding-right: 1rem;
            }
        }
    `,
    template: `
        @if (visible()) {
            <section
                class="relative grid lg:grid-cols-[19rem_minmax(0,1fr)] mb-4 overflow-hidden rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
                aria-labelledby="first-week-guide-title"
                data-testid="first-week-guide"
            >
                <div class="fwg-side flex flex-col gap-2 p-6 max-lg:p-4 max-lg:pr-12">
                    <p class="m-0 text-sm font-medium opacity-90">İlk hafta · {{ roleTitle }}</p>
                    <h2 id="first-week-guide-title" class="m-0 text-xl font-semibold leading-snug">{{ headline() }}</h2>
                    <p class="m-0 mt-auto pt-3 flex items-baseline gap-2" data-testid="first-week-guide-progress">
                        <span class="text-[2.75rem] max-lg:text-[1.75rem] font-semibold leading-none">{{ doneCount() }}</span>
                        <span class="opacity-90">/ {{ steps.length }} adım tamam</span>
                    </p>
                    <div class="h-1.5 rounded-full bg-white/30 overflow-hidden" aria-hidden="true"><span class="block h-full rounded-full bg-white" [style.width.%]="(doneCount() / steps.length) * 100"></span></div>
                </div>

                <div class="flex flex-col gap-4 p-6 max-lg:p-4 min-w-0">
                    @if (selected(); as step) {
                        <div class="flex items-start gap-4 lg:pr-10" data-testid="first-week-guide-detail">
                            <span class="max-sm:hidden grid place-items-center w-12 h-12 shrink-0 rounded-border bg-primary-50 dark:bg-primary-950 text-primary" aria-hidden="true"><i [class]="step.icon + ' text-xl'"></i></span>
                            <div class="min-w-0 flex-1">
                                <p class="m-0 text-sm font-semibold text-primary">{{ stateLabel(step) }}</p>
                                <p class="m-0 mt-0.5 text-lg font-semibold">{{ order(step) }}. {{ step.title }}</p>
                                <p class="m-0 mt-1">{{ step.text }}</p>
                                <div class="mt-3 flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
                                    <a pButton class="whitespace-nowrap" [routerLink]="step.route" [outlined]="isDone(step.key)" data-testid="first-week-guide-link">{{ step.label }} <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                                    <button
                                        pButton
                                        type="button"
                                        severity="secondary"
                                        [text]="true"
                                        pTooltip="İşi kaydettiğinizde adım kendiliğinden işaretlenir; işaretler bu tarayıcıda saklanır."
                                        tooltipPosition="bottom"
                                        (click)="guide.toggle(step.key)"
                                        data-testid="first-week-guide-toggle"
                                    >
                                        {{ isDone(step.key) ? 'İşareti kaldır' : 'Yaptım' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    } @else {
                        <div class="flex items-start gap-4 lg:pr-10" data-testid="first-week-guide-complete">
                            <span class="max-sm:hidden grid place-items-center w-12 h-12 shrink-0 rounded-border bg-primary text-primary-contrast" aria-hidden="true"><i class="pi pi-trophy text-xl"></i></span>
                            <div class="min-w-0 flex-1">
                                <p class="m-0 text-lg font-semibold">Tebrikler, ilk haftayı tamamladınız!</p>
                                <p class="m-0 mt-1">Vetinity'yi günlük işinizde kullanmaya hazırsınız. Rehbere artık ihtiyacınız yok; isterseniz kullanıcı menüsündeki “İlk hafta rehberi” ile yeniden açabilirsiniz.</p>
                                <button pButton type="button" class="mt-3 max-sm:w-full" (click)="guide.dismiss()" data-testid="first-week-guide-finish"><i class="pi pi-check" aria-hidden="true"></i>Rehberi kapat</button>
                            </div>
                        </div>
                    }

                    <ol #chips class="flex flex-wrap gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 list-none m-0 p-0 mt-auto" aria-label="Adımlar">
                        @for (step of steps; track step.key) {
                            <li>
                                <button
                                    type="button"
                                    class="fwg-chip"
                                    [class.is-done]="isDone(step.key)"
                                    [class.is-selected]="step === selected()"
                                    [attr.aria-current]="step === selected() ? 'step' : null"
                                    (click)="selectedKey.set(step.key)"
                                    data-testid="first-week-guide-step"
                                >
                                    <span aria-hidden="true">
                                        @if (isDone(step.key)) {
                                            <i class="pi pi-check" style="font-size: 0.625rem"></i>
                                        } @else {
                                            {{ order(step) }}
                                        }
                                    </span>
                                    {{ step.title }}
                                    @if (isDone(step.key)) {
                                        <span class="sr-only">, tamam</span>
                                    }
                                </button>
                            </li>
                        }
                    </ol>
                </div>

                <button
                    pButton
                    type="button"
                    iconOnly
                    size="small"
                    [text]="true"
                    severity="secondary"
                    class="fwg-close"
                    aria-label="Rehberi kapat"
                    pTooltip="Kapat. Kullanıcı menüsündeki “İlk hafta rehberi” ile yeniden açılır."
                    tooltipPosition="left"
                    (click)="guide.dismiss()"
                    data-testid="first-week-guide-close"
                >
                    <i class="p-button-icon pi pi-times"></i>
                </button>
            </section>
        }
    `
})
export class FirstWeekGuideCardComponent implements OnInit {
    readonly guide = inject(FirstWeekGuideService);
    private readonly auth = inject(AuthService);

    private readonly hasClaim = (claim: string): boolean => this.auth.hasOperationClaim(claim);
    private readonly role = firstWeekGuideRole(this.hasClaim);

    readonly roleTitle = this.role ? FIRST_WEEK_GUIDE_ROLE_TITLES[this.role] : '';
    readonly steps = this.role ? firstWeekGuideSteps(this.role, this.hasClaim) : [];

    readonly visible = computed(() => {
        const state = this.guide.state();

        return this.steps.length > 0 && !!state && isFirstWeekGuideVisible(state, new Date());
    });
    readonly doneCount = computed(() => this.steps.filter((s) => this.isDone(s.key)).length);
    /** Sıradaki adım: listede ilk yapılmamış adım (sıra kılavuzdaki iş sırasıdır). Hepsi bitince `null`. */
    readonly nextStep = computed(() => this.steps.find((s) => !this.isDone(s.key)) ?? null);
    /** Sağda açık adım: hapla seçilir; bir adım işaretlenince seçim sıradakine döner. Hepsi bitince `null` (kutlama). */
    readonly selectedKey = linkedSignal<string | null>(() => this.nextStep()?.key ?? null);
    readonly selected = computed(() => this.steps.find((s) => s.key === this.selectedKey()) ?? null);

    readonly headline = computed(() => {
        const left = this.steps.length - this.doneCount();

        if (left === 0) {
            return 'İlk hafta tamam!';
        }

        return this.doneCount() === 0 ? `Hoş geldiniz! ${left} kısa adımla başlayalım.` : `İyi gidiyorsunuz, ${left} adım kaldı.`;
    });

    private readonly chips = viewChild<ElementRef<HTMLElement>>('chips');

    constructor() {
        // Telefonda haplar yana kayar: sıradaki adım ortada açılsın.
        afterNextRender(() => {
            const row = this.chips()?.nativeElement;
            const chip = row?.querySelector<HTMLElement>('.is-selected');

            if (row && chip && row.scrollWidth > row.clientWidth) {
                row.scrollLeft = chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
            }
        });
    }

    ngOnInit(): void {
        if (this.steps.length > 0) {
            this.guide.load();
        }
    }

    isDone(key: string): boolean {
        return this.guide.state()?.done.includes(key) ?? false;
    }

    /** 1'den başlayan sıra numarası. */
    order(step: FirstWeekGuideStep): number {
        return this.steps.indexOf(step) + 1;
    }

    stateLabel(step: FirstWeekGuideStep): string {
        if (this.isDone(step.key)) {
            return 'Tamamlandı';
        }

        return step === this.nextStep() ? 'Sıradaki adım' : 'Sonraki adımlardan';
    }
}
