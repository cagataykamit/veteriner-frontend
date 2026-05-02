import type { MessageService } from 'primeng/api';

export interface ToastTraceMessage {
    severity?: string;
    summary?: string;
    detail?: string;
    life?: number;
    [key: string]: unknown;
}

function textOrDash(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
}

export function addTracedToast(
    messages: MessageService,
    source: string,
    route: string,
    message: ToastTraceMessage
): void {
    const severity = textOrDash(message.severity);
    const summary = textOrDash(message.summary);
    const detail = textOrDash(message.detail);
    const timestamp = new Date().toISOString();
    // Geçici runtime teşhis izi: ses ile aynı anda hangi toast tetiklendiğini yakalamak için.
    console.info(
        `[ToastTrace] source=${source} severity=${severity} summary=${summary} detail=${detail} route=${route} timestamp=${timestamp}`
    );
    messages.add(message);
}
