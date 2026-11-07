import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { WorkingDay } from '@site-engine';
import { clinicWorkingHourDayLabel } from '@/app/entities/clinic/data/clinic-working-hours.mapper';

const DAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** Haftalık saat düzenleyici. Değişikliği bütün liste olarak verir; yazmak klinik saat ucuyladır (K8). */
@Component({
    selector: 'app-site-hours-editor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="head">
            <h3>Çalışma gün ve saatleri</h3>
            <button type="button" class="copy" (click)="copyMondayToWeekdays()"><i class="pi pi-copy" aria-hidden="true"></i>Pazartesiyi hafta içine uygula</button>
        </div>
        <div class="hours">
            @for (day of orderedDays(); track day.dayOfWeek) {
                <div class="hour" [class.is-closed]="day.isClosed">
                    <label class="day">
                        <input type="checkbox" role="switch" [checked]="!day.isClosed" [attr.aria-label]="dayName(day.dayOfWeek) + ' açık'" (change)="setDayOpen(day.dayOfWeek, $any($event.target).checked)" />
                        <span>{{ dayName(day.dayOfWeek) }}</span>
                    </label>
                    @if (day.isClosed) {
                        <span class="closed">Kapalı</span>
                    } @else {
                        <div class="times">
                            <input type="time" [attr.aria-label]="dayName(day.dayOfWeek) + ' açılış'" [value]="day.opensAt ?? ''" (change)="patchDay(day.dayOfWeek, { opensAt: $any($event.target).value })" />
                            <span aria-hidden="true">–</span>
                            <input type="time" [attr.aria-label]="dayName(day.dayOfWeek) + ' kapanış'" [value]="day.closesAt ?? ''" (change)="patchDay(day.dayOfWeek, { closesAt: $any($event.target).value })" />
                        </div>
                        @if (day.breakStartsAt) {
                            <div class="times">
                                <span class="closed">Mola</span>
                                <input type="time" [attr.aria-label]="dayName(day.dayOfWeek) + ' mola başlangıcı'" [value]="day.breakStartsAt" (change)="patchDay(day.dayOfWeek, { breakStartsAt: $any($event.target).value })" />
                                <span aria-hidden="true">–</span>
                                <input type="time" [attr.aria-label]="dayName(day.dayOfWeek) + ' mola bitişi'" [value]="day.breakEndsAt ?? ''" (change)="patchDay(day.dayOfWeek, { breakEndsAt: $any($event.target).value })" />
                                <button type="button" class="drop" [attr.aria-label]="dayName(day.dayOfWeek) + ' molasını kaldır'" (click)="patchDay(day.dayOfWeek, { breakStartsAt: null, breakEndsAt: null })"><i class="pi pi-times" aria-hidden="true"></i></button>
                            </div>
                        } @else {
                            <button type="button" class="copy" (click)="patchDay(day.dayOfWeek, { breakStartsAt: '13:00', breakEndsAt: '14:00' })"><i class="pi pi-plus" aria-hidden="true"></i>Mola ekle</button>
                        }
                    }
                </div>
            }
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
            }

            .head {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                margin-bottom: 6px;
            }

            h3 {
                margin: 0;
                color: inherit;
                font-size: 15px;
                font-weight: 650;
            }

            .copy {
                display: inline-flex;
                align-items: center;
                justify-self: start;
                gap: 6px;
                min-height: 36px;
                padding: 0;
                border: 0;
                background: transparent;
                color: var(--w-ink);
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                text-decoration: underline;
                text-underline-offset: 3px;
                cursor: pointer;
            }

            .copy .pi {
                font-size: 11px;
            }

            .hour {
                display: grid;
                gap: 6px;
                padding: 10px 0;
                border-top: 1px solid var(--w-line);
            }
        `,
        `
            .day {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            }

            input[role='switch'] {
                position: relative;
                flex: none;
                width: 44px;
                height: 26px;
                margin: 0;
                border-radius: 999px;
                background: var(--w-line-strong);
                appearance: none;
                cursor: pointer;
                transition: background-color 0.15s ease;
            }

            input[role='switch']::before {
                content: '';
                position: absolute;
                top: 3px;
                left: 3px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                transition: transform 0.15s ease;
            }

            input[role='switch']:checked {
                background: var(--w-ink);
            }

            input[role='switch']:checked::before {
                transform: translateX(18px);
            }

            .closed {
                color: var(--w-muted);
                font-size: 13px;
            }

            .times {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
            }

            input[type='time'] {
                flex: 1 1 96px;
                min-width: 0;
                max-width: 130px;
                min-height: 40px;
                padding: 0 8px;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 14px;
            }

            .drop {
                width: 40px;
                height: 40px;
                border: 0;
                background: transparent;
                color: var(--w-ink);
                cursor: pointer;
            }
        `
    ]
})
export class SiteHoursEditorComponent {
    readonly days = input.required<readonly WorkingDay[]>();
    readonly daysChange = output<readonly WorkingDay[]>();

    protected readonly orderedDays = computed(() => DAY_ORDER.map((dayOfWeek) => this.days().find((day) => day.dayOfWeek === dayOfWeek) ?? { dayOfWeek, isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null }));

    protected dayName(dayOfWeek: number): string {
        return clinicWorkingHourDayLabel(dayOfWeek);
    }

    protected patchDay(dayOfWeek: number, changes: Partial<WorkingDay>): void {
        this.daysChange.emit(this.orderedDays().map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day)));
    }

    protected setDayOpen(dayOfWeek: number, open: boolean): void {
        const day = this.orderedDays().find((item) => item.dayOfWeek === dayOfWeek);

        this.patchDay(dayOfWeek, { isClosed: !open, opensAt: day?.opensAt ?? '09:00', closesAt: day?.closesAt ?? '18:00' });
    }

    protected copyMondayToWeekdays(): void {
        const monday = this.orderedDays().find((day) => day.dayOfWeek === 1);

        if (!monday) return;

        this.daysChange.emit(this.orderedDays().map((day) => (day.dayOfWeek >= 2 && day.dayOfWeek <= 5 ? { ...monday, dayOfWeek: day.dayOfWeek } : day)));
    }
}
