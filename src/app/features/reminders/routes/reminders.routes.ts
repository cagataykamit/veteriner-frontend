import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { REMINDERS_MANAGE_CLAIM, REMINDERS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ReminderLogsPageComponent } from '@/app/features/reminders/pages/reminder-logs-page/reminder-logs-page.component';
import { ReminderSettingsPageComponent } from '@/app/features/reminders/pages/reminder-settings-page/reminder-settings-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                const canReadOrManage =
                    auth.hasOperationClaim(REMINDERS_READ_CLAIM) || auth.hasOperationClaim(REMINDERS_MANAGE_CLAIM);
                return canReadOrManage ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ReminderSettingsPageComponent
    },
    {
        path: 'logs',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(REMINDERS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ReminderLogsPageComponent
    }
] as Routes;
