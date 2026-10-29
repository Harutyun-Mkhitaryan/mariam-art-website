import type { APIRoute } from "astro";
import { FAVICON } from "../../lib/icons";

export const GET: APIRoute = () =>
  new Response(FAVICON, { headers: { "Content-Type": "image/svg+xml" } });
