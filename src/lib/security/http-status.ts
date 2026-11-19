/** The HTTP status codes this app returns, named so a route reads as intent rather than numbers. */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;
