import type { MessageService } from 'primeng/api';

export interface ToastTraceMessage {
    severity?: string;
    summary?: string;
    detail?: string;
    life?: number;
    [key: string]: unknown;
}

/**
 * Toast gösterir. `source` / `route` çağrı noktasında tutarlılık için korunur; otomatik konsol çıktısı üretilmez.
 */
export function addTracedToast(
    messages: MessageService,
    _source: string,
    _route: string,
    message: ToastTraceMessage
): void {
    messages.add(message);
}
