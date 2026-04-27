import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapReminderLogsPagedDtoToVm,
    mapReminderSettingsDtoToVm,
    reminderLogsQueryToHttpParams
} from '@/app/features/reminders/data/reminders.mapper';
import type { ReminderLogsPagedDto, ReminderLogsQuery } from '@/app/features/reminders/models/reminder-log-api.model';
import type { ReminderLogsPagedVm } from '@/app/features/reminders/models/reminder-log-vm.model';
import type {
    ReminderSettingsDto,
    ReminderSettingsUpdateRequestDto
} from '@/app/features/reminders/models/reminder-settings-api.model';
import type { ReminderSettingsVm } from '@/app/features/reminders/models/reminder-settings-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class RemindersService {
    private readonly api = inject(ApiClient);

    getSettings(): Observable<ReminderSettingsVm> {
        return this.api.get<ReminderSettingsDto>(ApiEndpoints.reminders.settings()).pipe(
            map(mapReminderSettingsDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hatırlatma ayarları yüklenemedi.')))
            )
        );
    }

    updateSettings(body: ReminderSettingsUpdateRequestDto): Observable<ReminderSettingsVm> {
        return this.api.put<ReminderSettingsDto>(ApiEndpoints.reminders.settings(), body).pipe(
            map(mapReminderSettingsDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hatırlatma ayarları kaydedilemedi.')))
            )
        );
    }

    getLogs(query: ReminderLogsQuery): Observable<ReminderLogsPagedVm> {
        return this.api.get<ReminderLogsPagedDto>(ApiEndpoints.reminders.logs(), reminderLogsQueryToHttpParams(query)).pipe(
            map(mapReminderLogsPagedDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hatırlatma geçmişi yüklenemedi.')))
            )
        );
    }
}
