
/// <reference types="astro/client" />

interface Window {
  trackConversion?: (
    eventName: string,
    params?: Record<string, unknown>,
  ) => void;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  ym?: (...args: unknown[]) => void;
  __METRIKA_ID__?: string | number;
}