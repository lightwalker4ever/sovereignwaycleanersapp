"use server";

import { z } from "zod";
import { Resend } from "resend";
import { nameSchema, emailSchema, phoneSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSalesNotificationEmail } from "@/lib/app-settings";

const schema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  service: z.string().min(1, "Please select one service"),
  message: z.string().min(50, "Please provide a description of at least 50 characters"),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitContactForm(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    service: formData.get("service") as string,
    message: formData.get("message"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, phone, service, message } = parsed.data;
  const propertyType = (formData.get("propertyType") as string) || null;
  const preferredDate = (formData.get("preferredDate") as string) || null;
  const preferredTime = (formData.get("preferredTime") as string) || null;

  // Persist first -- this is the authoritative capture of the lead.
  // Email delivery below is best-effort and must never cause an
  // already-saved enquiry to be reported as failed (which would
  // prompt the customer to resubmit and create a duplicate).
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("contact_requests").insert({
    name,
    email,
    phone: phone ?? null,
    service,
    property_type: propertyType,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
    message,
  });
  if (insertError) {
    return { success: false, error: "Failed to save your request. Please try again." };
  }

  const notificationEmail = await getSalesNotificationEmail();

  try {
    await resend.emails.send({
      from: "Website <onboarding@resend.dev>",
      to: notificationEmail,
      subject: `New enquiry from ${name}`,
      html: `
        <h2>New Quote Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        <p><strong>Service:</strong> ${service}</p>
        ${propertyType ? `<p><strong>Property Type:</strong> ${propertyType}</p>` : ""}
        ${preferredDate ? `<p><strong>Preferred Date:</strong> ${preferredDate}</p>` : ""}
        ${preferredTime ? `<p><strong>Preferred Time:</strong> ${preferredTime}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });
  } catch (e) {
    console.error("Failed to send contact-form notification email", e);
  }

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: email,
      subject: "We've received your quote request",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for getting in touch! We've received your request for <strong>${service}</strong> and will get back to you within 24 hours.</p>
        <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong> or reply to this email.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send contact-form confirmation email", e);
  }

  return { success: true };
}
