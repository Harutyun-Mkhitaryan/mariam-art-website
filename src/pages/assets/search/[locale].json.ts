import type { APIRoute } from "astro";
import { LOCALES } from "../../../lib/config";
import { buildIndex } from "../../../lib/search";

export const getStaticPaths = () => LOCALES.map((locale) => ({ params: { locale } }));

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(buildIndex(params.locale as string)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
