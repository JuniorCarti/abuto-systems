export const calendarScopes = [
  "https://www.googleapis.com/auth/calendar.events.freebusy",
  "https://www.googleapis.com/auth/calendar.events.owned",
] as const;

export const organizerCalendar = "abutosystems@gmail.com";

export type GoogleCalendarConfig = {
  GOOGLE_CALENDAR_CLIENT_ID?: string;
  GOOGLE_CALENDAR_CLIENT_SECRET?: string;
  GOOGLE_CALENDAR_REFRESH_TOKEN?: string;
};

type GoogleErrorCode = "not_configured" | "oauth_denied" | "unauthorized" | "forbidden" | "rate_limited" | "provider_unavailable" | "provider_rejected" | "timeout" | "invalid_response";

export class GoogleCalendarError extends Error {
  readonly code: GoogleErrorCode;
  constructor(code: GoogleErrorCode) {
    super(`Google Calendar operation failed: ${code}`);
    this.code = code;
  }
}

type Fetcher = typeof fetch;
type TokenResult = { access_token?: unknown; error?: unknown };

function errorForStatus(status: number): GoogleErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "provider_rejected";
}

async function token(config: GoogleCalendarConfig, fetcher: Fetcher) {
  const { GOOGLE_CALENDAR_CLIENT_ID: clientId, GOOGLE_CALENDAR_CLIENT_SECRET: clientSecret, GOOGLE_CALENDAR_REFRESH_TOKEN: refreshToken } = config;
  if (!clientId || !clientSecret || !refreshToken) throw new GoogleCalendarError("not_configured");

  let response: Response;
  try {
    response = await fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new GoogleCalendarError("timeout");
  }
  let result: TokenResult;
  try { result = await response.json() as TokenResult; } catch { throw new GoogleCalendarError("invalid_response"); }
  if (!response.ok) throw new GoogleCalendarError(result.error === "invalid_grant" ? "oauth_denied" : errorForStatus(response.status));
  if (typeof result.access_token !== "string" || !result.access_token) throw new GoogleCalendarError("invalid_response");
  return result.access_token;
}

async function googleRequest<T>(config: GoogleCalendarConfig, url: string, init: RequestInit, fetcher: Fetcher): Promise<T> {
  const accessToken = await token(config, fetcher);
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new GoogleCalendarError("timeout");
  }
  if (!response.ok) throw new GoogleCalendarError(errorForStatus(response.status));
  try { return await response.json() as T; } catch { throw new GoogleCalendarError("invalid_response"); }
}

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: Array<{ start?: string; end?: string }>; errors?: unknown[] }>;
};

export async function queryCalendarBusy(config: GoogleCalendarConfig, start: string, end: string, fetcher: Fetcher = fetch) {
  const result = await googleRequest<FreeBusyResponse>(config, "https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: start, timeMax: end, timeZone: "Africa/Nairobi", items: [{ id: organizerCalendar }] }),
  }, fetcher);
  const calendar = result.calendars?.[organizerCalendar];
  if (!calendar || (calendar.errors?.length ?? 0) > 0 || !Array.isArray(calendar.busy)) throw new GoogleCalendarError("provider_rejected");
  const busy = calendar.busy.map(item => {
    const start = typeof item.start === "string" ? Date.parse(item.start) : Number.NaN;
    const end = typeof item.end === "string" ? Date.parse(item.end) : Number.NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new GoogleCalendarError("invalid_response");
    return { start: item.start as string, end: item.end as string };
  });
  return busy;
}

export type CalendarEventInput = {
  id: string;
  conferenceRequestId: string;
  title: string;
  description: string;
  email: string;
  start: string;
  end: string;
};

export type CalendarEvent = {
  id?: string;
  htmlLink?: string;
  status?: string;
  attendees?: Array<{ email?: string; responseStatus?: string }>;
  conferenceData?: {
    createRequest?: { requestId?: string; status?: { statusCode?: string } };
    conferenceSolution?: { key?: { type?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

function eventUrl(eventId: string) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerCalendar)}/events/${encodeURIComponent(eventId)}`;
}

export async function getCalendarEvent(config: GoogleCalendarConfig, eventId: string, fetcher: Fetcher = fetch): Promise<CalendarEvent | null> {
  const accessToken = await token(config, fetcher);
  let response: Response;
  try {
    response = await fetcher(eventUrl(eventId), { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) });
  } catch { throw new GoogleCalendarError("timeout"); }
  if (response.status === 404) return null;
  if (!response.ok) throw new GoogleCalendarError(errorForStatus(response.status));
  try { return await response.json() as CalendarEvent; } catch { throw new GoogleCalendarError("invalid_response"); }
}

export async function createCalendarEvent(config: GoogleCalendarConfig, event: CalendarEventInput, fetcher: Fetcher = fetch) {
  const body = {
    id: event.id,
    summary: event.title,
    description: event.description,
    start: { dateTime: event.start, timeZone: "Africa/Nairobi" },
    end: { dateTime: event.end, timeZone: "Africa/Nairobi" },
    attendees: [{ email: event.email }],
    conferenceData: {
      createRequest: {
        requestId: event.conferenceRequestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
  try {
    return await googleRequest<CalendarEvent>(config, `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerCalendar)}/events?conferenceDataVersion=1&sendUpdates=all`, {
      method: "POST", body: JSON.stringify(body),
    }, fetcher);
  } catch (error) {
    if (error instanceof GoogleCalendarError && error.code === "provider_rejected") {
      const existing = await getCalendarEvent(config, event.id, fetcher);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function requestCalendarConference(config: GoogleCalendarConfig, eventId: string, requestId: string, fetcher: Fetcher = fetch) {
  return googleRequest<CalendarEvent>(config, `${eventUrl(eventId)}?conferenceDataVersion=1&sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({ conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } } }),
  }, fetcher);
}

export async function addCalendarAttendee(config: GoogleCalendarConfig, eventId: string, email: string, fetcher: Fetcher = fetch) {
  return googleRequest<CalendarEvent>(config, `${eventUrl(eventId)}?sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({ attendees: [{ email }] }),
  }, fetcher);
}

function validMeetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "meet.google.com" || url.username || url.password || !/^\/[a-z0-9-]+$/i.test(url.pathname)) return null;
    return url.toString();
  } catch { return null; }
}

export function meetConference(event: CalendarEvent) {
  const status = event.conferenceData?.createRequest?.status?.statusCode;
  const meet = event.conferenceData?.entryPoints?.find(entry => entry.entryPointType === "video")?.uri;
  const url = validMeetUrl(meet);
  if (status === "success" && url) return { status: "success" as const, url };
  if (status === "failure") return { status: "failed" as const, url: null };
  return { status: "pending" as const, url: null };
}
