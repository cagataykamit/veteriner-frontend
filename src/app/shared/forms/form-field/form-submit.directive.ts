import { afterNextRender, computed, contentChildren, DestroyRef, Directive, ElementRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormGroupDirective, NgControl } from '@angular/forms';
import { fieldLabelFromDom, revealField } from '@/app/shared/forms/form-field/form-field.utils';

/** `app-form-field` sarmalayıcısının yönergeye tanıttığı yüz (etiket ve kontrol tek yerde). */
export interface RegisteredFormField {
    readonly element: HTMLElement;
    fieldControl(): AbstractControl | null;
    fieldLabel(): string;
}

export interface FormFieldIssue {
    readonly label: string;
    /** Zorunlu alan boş: özet "eksik" der; diğer hatalarda "kontrol edin". */
    readonly missing: boolean;
    readonly element: HTMLElement;
}

/**
 * Kaydet hep etkin formun gönderim davranışı (O3, O8):
 * - Geçersiz gönderimde tüm alanlar işaretlenir, ilk hatalı alana kaydırılıp odaklanılır, `app-form-error-summary` eksikleri sayar.
 * - Ctrl+Enter (Mac'te Cmd+Enter) formu gönderir; Kaydet pasifse (kayıt sürüyor) bir şey yapmaz.
 * Sayfanın kendi `(ngSubmit)` işleyicisi değişmeden çalışır; geçersiz formu göndermemek onun işidir.
 */
@Directive({
    selector: 'form[appFormSubmit]',
    standalone: true,
    exportAs: 'appFormSubmit',
    host: {
        '(keydown.control.enter)': 'submitFromKeyboard($event)',
        '(keydown.meta.enter)': 'submitFromKeyboard($event)',
        '(reset)': 'submitted.set(false)'
    }
})
export class FormSubmitDirective {
    private readonly formGroup = inject(FormGroupDirective);
    private readonly host = inject<ElementRef<HTMLFormElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);

    private readonly controls = contentChildren(NgControl, { descendants: true });
    private readonly controlElements = contentChildren(NgControl, { descendants: true, read: ElementRef });
    private readonly fields = new Set<RegisteredFormField>();
    private readonly statusVersion = signal(0);
    private watchingStatus = false;

    readonly submitted = signal(false);
    /** Gönderimden sonra canlı: alan düzeldikçe listeden düşer. */
    readonly issues = computed(() => {
        this.statusVersion();

        return this.submitted() ? this.collectIssues() : [];
    });

    constructor() {
        this.formGroup.ngSubmit.pipe(takeUntilDestroyed()).subscribe(() => this.onSubmit());
    }

    register(field: RegisteredFormField): void {
        this.fields.add(field);
    }

    unregister(field: RegisteredFormField): void {
        this.fields.delete(field);
    }

    focusIssue(issue: FormFieldIssue): void {
        revealField(issue.element);
    }

    protected submitFromKeyboard(event: Event): void {
        event.preventDefault();
        const form = this.host.nativeElement;
        const submitButtons = Array.from(form.elements).filter((e): e is HTMLButtonElement => e instanceof HTMLButtonElement && e.type === 'submit');

        if (submitButtons.length > 0 && submitButtons.every((b) => b.disabled)) {
            return;
        }

        form.requestSubmit();
    }

    /**
     * Gönderimden bağımsız tetikleme: formun dışındaki ikinci kayıt düğmesi (ör. "Kaydet" yanında "Kaydet ve ödeme al") eksikleri
     * aynı yolla gösterir. Form geçersizse `true` döner.
     */
    revealIssues(): boolean {
        this.onSubmit();

        return this.formGroup.form.invalid;
    }

    private onSubmit(): void {
        const form = this.formGroup.form;

        if (form.valid) {
            this.submitted.set(false);

            return;
        }

        form.markAllAsTouched();
        this.watchStatus();
        this.submitted.set(true);
        this.statusVersion.update((v) => v + 1);

        afterNextRender(
            () => {
                const first = this.issues()[0]?.element ?? this.host.nativeElement.querySelector<HTMLElement>('.ng-invalid:not(form):not([formgroupname]):not([formarrayname])');

                if (first) {
                    revealField(first);
                }
            },
            { injector: this.injector }
        );
    }

    private watchStatus(): void {
        if (this.watchingStatus) {
            return;
        }

        this.watchingStatus = true;
        this.formGroup.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.statusVersion.update((v) => v + 1));
    }

    private collectIssues(): FormFieldIssue[] {
        const byControl = new Map<AbstractControl, FormFieldIssue>();
        const add = (control: AbstractControl | null, element: HTMLElement, label: () => string) => {
            if (!control || !control.invalid || control.disabled || byControl.has(control) || !element.isConnected) {
                return;
            }

            byControl.set(control, { label: label(), missing: !!control.errors?.['required'], element });
        };

        // Sarmalayıcı önce: etiketi en doğru kaynak odur.
        for (const field of this.fields) {
            add(field.fieldControl(), field.element, () => field.fieldLabel());
        }

        const elements = this.controlElements();

        this.controls().forEach((ngControl, i) => {
            const element = elements[i]?.nativeElement as HTMLElement | undefined;

            if (element) {
                add(ngControl.control, element, () => this.labelFor(element));
            }
        });

        return [...byControl.values()].sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    }

    private labelFor(element: HTMLElement): string {
        const wrapped = [...this.fields].find((f) => f.element.contains(element));

        return wrapped?.fieldLabel() || fieldLabelFromDom(element);
    }
}
