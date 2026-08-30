import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const enquirySchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(255),
  concern: z.string().trim().max(1000).optional().default(""),
  preferredDate: z.string().trim().max(20).optional().default(""),
  service: z.string().trim().max(120).optional().default(""),
  preferredTime: z.string().trim().max(20).optional().default(""),
});

export const submitEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => enquirySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("enquiries")
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        concern: data.concern || null,
        preferred_date: data.preferredDate || null,
        service: data.service || null,
        preferred_time: data.preferredTime || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[enquiries] insert failed", error.message);
      return { ok: false as const, error: "Could not save your request. Please call the clinic." };
    }

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

      await sendTemplateEmail("booking-confirmation", data.email, {
        templateData: {
          name: data.fullName,
          preferredDate: [data.preferredDate, data.preferredTime].filter(Boolean).join(" "),
          concern: [data.service, data.concern].filter(Boolean).join(" — "),
        },
        idempotencyKey: `booking-confirmation-${row.id}`,
      });

      const clinicInbox = process.env["CLINIC_INBOX_EMAIL"];
      if (clinicInbox) {
        await sendTemplateEmail("enquiry-notification", clinicInbox, {
          templateData: {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            preferredDate: [data.preferredDate, data.preferredTime].filter(Boolean).join(" "),
            concern: [data.service, data.concern].filter(Boolean).join(" — "),
          },
          idempotencyKey: `enquiry-notification-${row.id}`,
          replyTo: data.email,
        });
      }
    } catch (mailError) {
      console.error("[enquiries] email send failed", mailError);
    }

    return { ok: true as const, id: row.id };
  });
