import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { REMINDERS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ReminderLogsPageComponent } from '@/app/features/reminders/pages/reminder-logs-page/reminder-logs-page.component';
import { ReminderSettingsPageComponent } from '@/app/features/reminders/pages/reminder-settings-page/reminder-settings-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(REMINDERS_READ_CLAIM)
                    ? true
                    : router.createUrlTree([PANEL_FORBIDDEN_URL]);
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

                return auth.hasOperationClaim(REMINDERS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: ReminderLogsPageComponent
    }
] as Routes;
