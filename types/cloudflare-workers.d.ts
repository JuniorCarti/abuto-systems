declare module "cloudflare:workers" {
  interface D1Result {
    success: boolean;
  }
  interface D1PreparedStatement {
    bind(...values: Array<string | number | null>): D1PreparedStatement;
    run(): Promise<D1Result>;
  }
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }
  interface SendEmail {
    send(message: {
      to: string;
      from: string;
      subject: string;
      text: string;
    }): Promise<unknown>;
  }
  export const env: {
    LEADS_DB?: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    LEAD_NOTIFICATION_EMAIL?: SendEmail;
  };
}
