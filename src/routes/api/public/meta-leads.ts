import { createFileRoute } from "@tanstack/react-router";
import {
  bearerToken,
  META_LEAD_BODY_LIMIT_BYTES,
  metaLeadSchema,
  tokensMatch,
} from "@/lib/meta-lead.shared";

type IngestResult = {
  duplicate: boolean;
  enquiry_id: string;
};

export const Route = createFileRoute("/api/public/meta-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken =
          process.env["META_LEAD_INGEST_SECRET"] ?? "";

        if (!expectedToken) {
          console.error(
            "[meta-leads] META_LEAD_INGEST_SECRET is not configured",
          );

          return Response.json(
            {
              ok: false,
              error: "Lead intake is unavailable.",
            },
            {
              status: 503,
            },
          );
        }

        if (!(await tokensMatch(bearerToken(request), expectedToken))) {
          return Response.json(
            {
              ok: false,
              error: "Unauthorized.",
            },
            {
              status: 401,
            },
          );
        }

        const contentLength = Number(
          request.headers.get("content-length") ?? "0",
        );

        if (
          Number.isFinite(contentLength) &&
          contentLength > META_LEAD_BODY_LIMIT_BYTES
        ) {
          return Response.json(
            {
              ok: false,
              error: "Request is too large.",
            },
            {
              status: 413,
            },
          );
        }

        let input: unknown;

        try {
          const rawBody = await request.text();

          if (
            new TextEncoder().encode(rawBody).byteLength >
            META_LEAD_BODY_LIMIT_BYTES
          ) {
            return Response.json(
              {
                ok: false,
                error: "Request is too large.",
              },
              {
                status: 413,
              },
            );
          }

          input = JSON.parse(rawBody);
        } catch {
          return Response.json(
            {
              ok: false,
              error: "Invalid JSON.",
            },
            {
              status: 400,
            },
          );
        }

        const parsed = metaLeadSchema.safeParse(input);

        if (!parsed.success) {
          return Response.json(
            {
              ok: false,
              error: "Invalid lead payload.",
            },
            {
              status: 400,
            },
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const lead = parsed.data;

        const { data, error } = await supabaseAdmin.rpc(
          "ingest_meta_lead" as never,
          {
            _lead_id: lead.leadId,
            _form_id: lead.formId,
            _platform: lead.platform,
            _created_time: lead.createdTime,
            _full_name: lead.fullName,
            _phone: lead.phone,
            _email: lead.email,
            _clinic_branch: lead.clinicBranch,
            _service: lead.service,
            _campaign: lead.campaign,
          } as never,
        );

        if (error) {
          console.error(
            "[meta-leads] atomic intake failed",
            error.message,
          );

          return Response.json(
            {
              ok: false,
              error: "Could not save lead.",
            },
            {
              status: 500,
            },
          );
        }

        const result = (
          Array.isArray(data) ? data[0] : data
        ) as IngestResult | undefined;

        if (!result?.enquiry_id) {
          console.error(
            "[meta-leads] intake returned no enquiry id",
          );

          return Response.json(
            {
              ok: false,
              error: "Could not save lead.",
            },
            {
              status: 500,
            },
          );
        }

        return Response.json(
          {
            ok: true,
            duplicate: result.duplicate,
            enquiryId: result.enquiry_id,
          },
          {
            status: result.duplicate ? 200 : 201,
          },
        );
      },
    },
  },
});
