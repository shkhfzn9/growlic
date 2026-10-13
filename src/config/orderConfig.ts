/**
 * Order Configuration Constants
 */

export const ORDER_CONFIG = {
  // Threshold in minutes before an active prep timer is flagged as delayed in the admin view
  COUNTER_ORDER_DELAY_THRESHOLD_MINUTES: 10,

  // Threshold in minutes before live prep stopwatch is capped and stopped (guard rail)
  MAX_PREP_STOPWATCH_MINUTES: 60,

  // Default country code for phone normalization if not provided
  DEFAULT_COUNTRY_CODE: '+91',

  // Order sources
  SOURCES: {
    QR_SCAN: 'qr_scan',
    ADMIN_COUNTER: 'admin_counter',
  } as const,
};
