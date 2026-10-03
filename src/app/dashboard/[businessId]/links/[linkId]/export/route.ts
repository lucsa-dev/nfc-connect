import { toCsv } from "@/lib/csv";
import { getLink, getLinkVisits } from "@/lib/data";
import { parsePeriod, periodStart } from "@/lib/periods";

const COLUMNS = [
  "created_at",
  "source",
  "device_type",
  "device_vendor",
  "os",
  "os_version",
  "browser",
  "browser_version",
  "is_bot",
  "language",
  "country",
  "region",
  "city",
  "latitude",
  "longitude",
  "referer",
  "ip_hash",
  "user_agent",
] as const;

export async function GET(request: Request, ctx: RouteContext<"/dashboard/[businessId]/links/[linkId]/export">) {
  const { businessId, linkId } = await ctx.params;
  const days = parsePeriod(new URL(request.url).searchParams.get("dias"));
  const link = await getLink(businessId, linkId);
  const visits = await getLinkVisits(link.id, periodStart(days), 50000);

  // BOM para o Excel reconhecer UTF-8.
  const csv = "﻿" + toCsv(visits, [...COLUMNS]);
  const filename = `acessos-${link.business.slug}-${link.slug}-${days}d.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
