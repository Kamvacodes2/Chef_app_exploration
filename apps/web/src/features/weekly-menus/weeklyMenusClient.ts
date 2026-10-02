import { z } from "zod";
import { getChefmateApiUrl } from "@/lib/env";
import { readApiErrorMessage } from "@/lib/apiError";

const person = z.object({ id: z.string(), displayName: z.string(), email: z.string() });
export const menuItemSchema = z.object({
  day: z.number().int().min(1).max(7),
  forWhom: z.string(),
  meal: z.string(),
  spices: z.array(z.string()),
});
const revisionSchema = z.object({
  number: z.number(),
  submitted: z.boolean(),
  approvedAt: z.string().nullable(),
  approvedSpices: z.array(z.string()),
  items: z.array(menuItemSchema),
});
const menuSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  chefId: z.string(),
  weekStart: z.string(),
  status: z.enum(["DRAFT", "SENT", "CHANGES_REQUESTED", "APPROVED"]),
  version: z.number(),
  currentRevision: z.number(),
  submissionDeadline: z.string(),
  approvalDeadline: z.string(),
  submissionLate: z.boolean(),
  approvalLate: z.boolean(),
  revisions: z.array(revisionSchema),
  comments: z.array(
    z.object({
      id: z.string(),
      revision: z.number(),
      body: z.string(),
      alternative: z.string().nullable(),
      day: z.number().nullable(),
      forWhom: z.string().nullable(),
      requestsChanges: z.boolean(),
      author: z.object({ id: z.string(), displayName: z.string() }),
    }),
  ),
});
const workspaceSchema = z.object({
  relationships: z.array(
    z.object({ customerId: z.string(), chefId: z.string(), customer: person, chef: person }),
  ),
  menus: z.array(menuSchema),
  preferences: z.array(
    z.object({ customerId: z.string(), spices: z.array(z.string()), version: z.number() }),
  ),
  nextWeek: z.string(),
  timezone: z.string(),
});
export type MenuRole = "CHEF" | "CUSTOMER";
export type MenuItem = z.infer<typeof menuItemSchema>;
export type WeeklyMenu = z.infer<typeof menuSchema>;
export type MenuWorkspace = z.infer<typeof workspaceSchema>;

export async function menuApi(path: string, body?: unknown, method = "POST"): Promise<unknown> {
  const response = await fetch(`${getChefmateApiUrl().replace(/\/+$/, "")}/api/v1/${path}`, {
    method: body === undefined ? "GET" : method,
    credentials: "include",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Could not update weekly menus."));
  }
  return ((await response.json()) as { data: unknown }).data;
}
export async function fetchMenuWorkspace(role: MenuRole): Promise<MenuWorkspace> {
  return workspaceSchema.parse(
    await menuApi(`${role === "CHEF" ? "chef" : "account"}/weekly-menus`),
  );
}
