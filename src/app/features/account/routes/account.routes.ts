import { Routes } from '@angular/router';
import { AccountSummaryPageComponent } from '@/app/features/account/pages/account-summary-page/account-summary-page.component';
import { ChangePasswordPageComponent } from '@/app/features/account/pages/change-password-page/change-password-page.component';
import { unsavedChangesGuard } from '@/app/shared/ui/unsaved-changes/unsaved-changes.guard';

export default [
    { path: '', component: AccountSummaryPageComponent },
    { path: 'change-password', component: ChangePasswordPageComponent, canDeactivate: [unsavedChangesGuard] }
] as Routes;
