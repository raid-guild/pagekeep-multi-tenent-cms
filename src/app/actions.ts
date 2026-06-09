"use server";

import { revalidatePath } from "next/cache";

import { createTenant } from "@/lib/tenants";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTenantAction(formData: FormData) {
  const orgName = readRequiredString(formData, "org_name");
  const siteName = readRequiredString(formData, "site_name");
  const adminEmail = readRequiredString(formData, "admin_email");
  const adminName = readRequiredString(formData, "admin_name");
  const templateKey = readRequiredString(formData, "template_key");

  if (!orgName || !siteName || !adminEmail || !templateKey) {
    throw new Error("Missing required create-site fields.");
  }

  createTenant({
    orgName,
    siteName,
    adminEmail,
    adminName: adminName || null,
    templateKey,
  });

  revalidatePath("/");
}
