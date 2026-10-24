import { mapReminderLogItemDtoToVm } from '@/app/features/reminders/data/reminders.mapper';
import type { ReminderLogItemDto } from '@/app/features/reminders/models/reminder-log-api.model';

function logItem(overrides: Partial<ReminderLogItemDto> = {}): ReminderLogItemDto {
    return {
        id: 'log-1',
        clinicId: 'c1',
        reminderType: 'Appointment',
        sourceEntityType: 'Appointment',
        sourceEntityId: 'a1',
        recipientEmail: 'ayse@example.com',
        recipientName: 'Ayşe',
        scheduledForUtc: '2026-10-24T06:00:00Z',
        reminderDueAtUtc: null,
        status: 'Skipped',
        outboxMessageId: null,
        sentAtUtc: null,
        failedAtUtc: null,
        lastError: null,
        createdAtUtc: '2026-10-24T05:00:00Z',
        ...overrides
    };
}

describe('reminders.mapper — hatırlatma günlüğü', () => {
    it('TrialDailyLimit atlaması okunur etiket ve açıklama alır; ham kod gösterilmez (TRIAL-004, sözleşme §3.3)', () => {
        const vm = mapReminderLogItemDtoToVm(logItem({ lastError: 'TrialDailyLimit' }));

        expect(vm.statusLabel).toBe('Deneme günlük sınırı (20)');
        expect(vm.statusSeverity).toBe('warn');
        expect(vm.errorDisplay).toContain('günlük e-posta sınırı (20)');
        expect(vm.errorDisplay).toContain('abonelikle kalkar');
        expect(vm.errorDisplay).not.toContain('TrialDailyLimit');
        expect(vm.statusLabel).not.toContain('TrialDailyLimit');
    });

    it('başka nedenle atlanan kayıt "Atlandı" kalır ve hata metni olduğu gibi gösterilir', () => {
        const vm = mapReminderLogItemDtoToVm(logItem({ lastError: 'Alıcı e-posta istemiyor' }));

        expect(vm.statusLabel).toBe('Atlandı');
        expect(vm.errorDisplay).toBe('Alıcı e-posta istemiyor');
    });

    it('gönderilen kayıtta hata sütunu boş gösterilir', () => {
        const vm = mapReminderLogItemDtoToVm(logItem({ status: 'Sent', sentAtUtc: '2026-10-24T06:01:00Z' }));

        expect(vm.statusLabel).toBe('Gönderildi');
        expect(vm.statusSeverity).toBe('success');
        expect(vm.errorDisplay).toBe('—');
        expect(vm.primaryDateUtc).toBe('2026-10-24T06:01:00Z');
    });
});
