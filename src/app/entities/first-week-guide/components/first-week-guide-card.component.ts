import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '@/app/core/auth/auth.service';
import { FIRST_WEEK_GUIDE_ROLE_TITLES, firstWeekGuideRole, firstWeekGuideSteps } from '@/app/entities/first-week-guide/utils/first-week-guide.steps';
import { FirstWeekGuideService, isFirstWeekGuideVisible } from '@/app/entities/first-week-guide/services/first-week-guide.service';

/**
 * Bugün ekranında rolüne göre "İlk hafta" adımları (TIER-022). İlk görüldüğünden 14 gün kendiliğinden açılır; kapatılınca
 * bir daha çıkmaz, kullanıcı menüsündeki "İlk hafta rehberi" ile yeniden açılır. Rolü olmayan ya da adımı kalmayan kullanıcıda çizilmez.
 */
@Component({
    selector: 'app-first-week-guide-card',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <section class="card mb-4" aria-labelledby="first-week-guide-title" data-testid="first-week-guide">
                <div class="flex items-start justify-between gap-2 mb-3">
                    <div class="min-w-0">
                        <h2 id="first-week-guide-title" class="text-base font-medium m-0">İlk hafta: {{ roleTitle }}</h2>
                        <p class="text-sm text-muted-color m-0 mt-1" data-testid="first-week-guide-progress">Vetinity'yi günlük işinizle tanımak için kısa adımlar · {{ doneCount() }}/{{ steps.length }} tamam</p>
                    </div>
                    <button pButton type="button" iconOnly size="small" [text]="true" severity="secondary" aria-label="Rehberi kapat" (click)="guide.dismiss()" data-testid="first-week-guide-close"><i class="p-button-icon pi pi-times"></i></button>
                </div>
                <ol class="list-none m-0 p-0 flex flex-col gap-3">
                    @for (step of steps; track step.key) {
                        <li class="flex items-start gap-3" data-testid="first-week-guide-step">
                            <p-checkbox [inputId]="'first-week-' + step.key" [binary]="true" [ngModel]="isDone(step.key)" (ngModelChange)="guide.toggle(step.key)" />
                            <div class="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <label [for]="'first-week-' + step.key" class="text-sm min-w-0" [class.text-muted-color]="isDone(step.key)">{{ step.text }}</label>
                                <a [routerLink]="step.route" class="text-sm whitespace-nowrap">{{ step.label }} <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i></a>
                            </div>
                        </li>
                    }
                </ol>
                <p class="text-xs text-muted-color mt-3 mb-0">İşi kaydettiğinizde adım kendiliğinden işaretlenir; işaretler bu tarayıcıda saklanır. Kapatırsanız kullanıcı menüsündeki “İlk hafta rehberi” ile yeniden açabilirsiniz.</p>
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
    readonly doneCount = computed(() => this.steps.filter((s) => this.guide.state()?.done.includes(s.key)).length);

    ngOnInit(): void {
        if (this.steps.length > 0) {
            this.guide.load();
        }
    }

    isDone(key: string): boolean {
        return this.guide.state()?.done.includes(key) ?? false;
    }
}
