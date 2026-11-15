import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { type FormFieldIssue, FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';

/** "2 alan eksik: Hasta, Randevu saati" (O3). Ad yoksa yalnız sayı söylenir. */
export function formIssueSummary(issues: readonly FormFieldIssue[]): string {
    const names = issues.map((i) => i.label).filter((l) => !!l);
    const verb = issues.every((i) => i.missing) ? 'eksik' : 'eksik ya da hatalı';
    const head = `${issues.length} alan ${verb}`;

    return names.length > 0 ? `${head}:` : `${head}.`;
}

/**
 * Formun üstündeki eksik alan özeti (O3): Kaydet'e basıldıktan sonra görünür, alan düzeldikçe kısalır.
 * Ad tıklanınca o alana gidilir. `form[appFormSubmit]` içinde kullanılır.
 */
@Component({
    selector: 'app-form-error-summary',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (issues().length > 0) {
            <div class="form-error-summary mb-4" role="alert" data-testid="form-error-summary">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                <span>
                    {{ heading() }}
                    @for (issue of namedIssues(); track issue.element; let last = $last) {
                        <button type="button" class="form-error-summary__link" (click)="submit.focusIssue(issue)">{{ issue.label }}</button>{{ last ? '' : ', ' }}
                    }
                </span>
            </div>
        }
    `,
    styles: `
        .form-error-summary {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.625rem 0.875rem;
            border-radius: var(--p-border-radius-md, 6px);
            border: 1px solid color-mix(in srgb, var(--p-red-500) 40%, transparent);
            background: color-mix(in srgb, var(--p-red-500) 8%, transparent);
            color: var(--p-red-700);
        }
        :host-context(.app-dark) .form-error-summary {
            color: var(--p-red-300);
        }
        .form-error-summary .pi {
            margin-top: 0.15rem;
        }
        .form-error-summary__link {
            background: none;
            border: 0;
            padding: 0;
            font: inherit;
            font-weight: 600;
            color: inherit;
            text-decoration: underline;
            cursor: pointer;
        }
    `
})
export class FormErrorSummaryComponent {
    protected readonly submit = inject(FormSubmitDirective);

    protected readonly issues = this.submit.issues;
    protected readonly namedIssues = computed(() => this.issues().filter((i) => !!i.label));
    protected readonly heading = computed(() => formIssueSummary(this.issues()));
}
