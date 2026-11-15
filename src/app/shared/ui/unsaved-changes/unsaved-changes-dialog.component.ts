import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UNSAVED_CHANGES_CONFIRM } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { UnsavedChangesService } from '@/app/shared/ui/unsaved-changes/unsaved-changes.service';

/** Kaydedilmemiş değişiklik sorusu (O2); panel düzeninde bir kez çizilir. Esc ve çarpı "Sayfada kal" sayılır. */
@Component({
    selector: 'app-unsaved-changes-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog
            [header]="copy.header"
            [visible]="unsavedChanges.asking()"
            (visibleChange)="!$event && unsavedChanges.answer(false)"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: 'min(440px, 95vw)' }"
            role="alertdialog"
        >
            <p class="m-0 flex items-start gap-3"><i class="pi pi-exclamation-triangle text-xl text-orange-500" aria-hidden="true"></i>{{ copy.message }}</p>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" data-testid="unsaved-stay" (click)="unsavedChanges.answer(false)">{{ copy.stayLabel }}</button>
                <button pButton type="button" severity="danger" [outlined]="true" data-testid="unsaved-leave" (click)="unsavedChanges.answer(true)">{{ copy.leaveLabel }}</button>
            </ng-template>
        </p-dialog>
    `
})
export class UnsavedChangesDialogComponent {
    protected readonly unsavedChanges = inject(UnsavedChangesService);
    protected readonly copy = UNSAVED_CHANGES_CONFIRM;
}
