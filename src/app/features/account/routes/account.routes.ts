import { Routes } from '@angular/router';
import { AccountSummaryPageComponent } from '@/app/features/account/pages/account-summary-page/account-summary-page.component';
import { ChangePasswordPageComponent } from '@/app/features/account/pages/change-password-page/change-password-page.component';

export default [
    { path: '', component: AccountSummaryPageComponent },
    { path: 'change-password', component: ChangePasswordPageComponent }
] as Routes;
