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
  export const env: {
    LEADS_DB?: D1Database;
    TURNSTILE_SECRET_KEY?: string;
    RESEND_API_KEY?: string;
  };
}
