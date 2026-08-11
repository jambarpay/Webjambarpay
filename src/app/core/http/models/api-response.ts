export interface ApiEnvelope<T> {
  data: T;
  meta?: ApiMetadata;
}

export interface ApiMetadata {
  correlationId?: string;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
}

export interface ApiErrorPayload {
  code?: string;
  errorCode?: string;
  message?: string;
  correlationId?: string;
  validationErrors?: Record<string, string[]>;
}

export type ApiQueryValue = string | number | boolean | readonly (string | number | boolean)[];
export type ApiQuery = Readonly<Record<string, ApiQueryValue | null | undefined>>;
