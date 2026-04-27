import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
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
                    auth.hasOperationClaim('Reminders.Read') || auth.hasOperationClaim('Reminders.Manage');
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
                return auth.hasOperationClaim('Reminders.Read') ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ReminderLogsPageComponent
    }
] as Routes;
