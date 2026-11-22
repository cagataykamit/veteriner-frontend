import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PortalTheme, type PortalThemePreference } from '@portal/app/core/theme/portal-theme';

const OPTIONS: readonly { readonly value: PortalThemePreference; readonly label: string }[] = [
    { value: 'system', label: 'Cihaza göre' },
    { value: 'light', label: 'Açık' },
    { value: 'dark', label: 'Koyu' }
];

/** Hesabım > Görünüm: açık/koyu tema; varsayılan cihazın ayarı. Tercih bu cihaza özeldir. */
@Component({
    selector: 'portal-theme-setting',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-segmented {
            grid-template-columns: repeat(3, 1fr);
        }
    `,
    template: `
        <section class="portal-card portal-stack" aria-labelledby="theme-setting-title" data-testid="theme-setting">
            <h2 id="theme-setting-title" class="portal-subtitle">Görünüm</h2>
            <div class="portal-segmented" role="group" aria-labelledby="theme-setting-title">
                @for (option of options; track option.value) {
                    <button
                        type="button"
                        [class.is-active]="theme.preference() === option.value"
                        [attr.aria-pressed]="theme.preference() === option.value"
                        [attr.data-theme]="option.value"
                        (click)="theme.setPreference(option.value)"
                    >
                        {{ option.label }}
                    </button>
                }
            </div>
            <p class="portal-field-hint">Cihaza göre seçiliyken telefonunuz koyu temadaysa portal da koyu açılır.</p>
        </section>
    `
})
export class PortalThemeSetting {
    protected readonly theme = inject(PortalTheme);
    protected readonly options = OPTIONS;
}
