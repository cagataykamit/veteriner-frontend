/** ASP.NET ProblemDetails — Swagger `ProblemDetails`. */
export interface ProblemDetails {
    type?: string | null;
    title?: string | null;
    status?: number | null;
    detail?: string | null;
    instance?: string | null;
    code?: string | null;
    traceId?: string | null;
    correlationId?: string | null;
    timestampUtc?: string | null;
    errors?: Record<string, string[] | string> | null;
}
