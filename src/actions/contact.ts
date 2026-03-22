"use server";

import { z } from "zod";
import { Resend } from "resend";

const schema = z.object({
  name: z.string().regex(/^[A-Za-z]+(?:[ '][A-Za-z]+)*$/, "Invalid name provided"),
  email: z.string().email("Invalid email provided"),
  phone: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = v.replace(/[\s\-().]/g, "");
      return (
        /^0\d{10}$/.test(n) &&
        /^0[123789]/.test(n) &&
        !/^0770[0-9]/.test(n) &&
        !/(\d)\1{4,}/.test(n) &&
        !/01234567/.test(n)
      );
    }, "Invalid phone number"),
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

  try {
    await resend.emails.send({
      from: "Website <onboarding@resend.dev>",
      to: "info@sovereignwaycleaners.co.uk",
      subject: `New enquiry from ${name}`,
      html: `
        <h2>New Contact Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        ${service ? `<p><strong>Service:</strong> ${service}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send message. Please try again." };
  }
}
