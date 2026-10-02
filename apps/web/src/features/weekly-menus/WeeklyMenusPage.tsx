"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMenuWorkspace,
  menuApi,
  type MenuItem,
  type MenuRole,
  type MenuWorkspace,
  type WeeklyMenu,
} from "./weeklyMenusClient";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const inputClass = "w-full rounded-xl border border-[var(--color-oxblood)]/20 p-3";
const buttonClass =
  "rounded-xl bg-[var(--color-oxblood)] px-4 py-2 font-bold text-white disabled:opacity-50";
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export function WeeklyMenusPage({ role }: { readonly role: MenuRole }) {
  const [data, setData] = useState<MenuWorkspace | null>(null);
  const [pairKey, setPairKey] = useState("");
  const [week, setWeek] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spiceText, setSpiceText] = useState("");
  const load = useCallback(async () => {
    const result = await fetchMenuWorkspace(role);
    setData(result);
    setPairKey(
      (previous) =>
        previous ||
        (result.relationships[0]
          ? `${result.relationships[0].customerId}:${result.relationships[0].chefId}`
          : ""),
    );
    setWeek((previous) => previous || result.nextWeek);
    setSpiceText(result.preferences[0]?.spices.join(", ") ?? "");
  }, [role]);
  useEffect(() => {
    void load().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "Could not load menus."),
    );
  }, [load]);
  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  const pair = data?.relationships.find((p) => `${p.customerId}:${p.chefId}` === pairKey);
  const menu = data?.menus.find(
    (m) => m.customerId === pair?.customerId && m.chefId === pair?.chefId && m.weekStart === week,
  );
  const preferences =
    data?.preferences.find((p) => p.customerId === pair?.customerId) ??
    (role === "CUSTOMER" ? data?.preferences[0] : undefined);
  const weeks = [
    ...new Set([
      data?.nextWeek ?? "",
      ...(data
        ? [
            new Date(new Date(`${data.nextWeek}T00:00:00Z`).getTime() - 7 * 86400000)
              .toISOString()
              .slice(0, 10),
          ]
        : []),
      ...(data?.menus
        .filter((m) => m.customerId === pair?.customerId && m.chefId === pair?.chefId)
        .map((m) => m.weekStart) ?? []),
    ]),
  ]
    .filter(Boolean)
    .sort()
    .reverse();

  return (
    <section className="space-y-5 rounded-3xl bg-white p-6">
      <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Weekly menus</h1>
      <p>
        Plan Monday–Sunday meals for each person. Chef submission: Friday 23:59. Customer approval:
        Saturday 23:59. All times are Johannesburg (SAST). Late actions remain available.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
          {notice}
        </p>
      )}
      {!data && !error && <p>Loading menus…</p>}
      {role === "CUSTOMER" && data && (
        <div className="space-y-3 rounded-2xl bg-[var(--color-warm-cream)] p-4">
          <h2 className="font-bold">Household-approved spices</h2>
          <p className="text-sm">
            Only you can change this list. An empty list means no spices are approved. Removing a
            spice used in an approved upcoming menu requires fresh menu approval.
          </p>
          <label className="block">
            Allowed spices, separated by commas
            <textarea
              className={inputClass}
              value={spiceText}
              maxLength={8000}
              onChange={(e) => setSpiceText(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await menuApi(
                  "account/approved-spices",
                  {
                    spices: spiceText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    expectedVersion: preferences?.version ?? 0,
                  },
                  "PUT",
                );
              }, "Household spice list saved.")
            }
          >
            Save approved spices
          </button>
        </div>
      )}
      {data && data.relationships.length === 0 && (
        <p>No active assigned trial or subscription is available for weekly planning.</p>
      )}
      {pair && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              {role === "CHEF" ? "Household" : "Assigned chef"}
              <select
                className={inputClass}
                value={pairKey}
                disabled={busy}
                onChange={(e) => setPairKey(e.target.value)}
              >
                {data?.relationships.map((p) => (
                  <option key={`${p.customerId}:${p.chefId}`} value={`${p.customerId}:${p.chefId}`}>
                    {role === "CHEF" ? p.customer.displayName : p.chef.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Week starting Monday
              <select
                className={inputClass}
                value={week}
                disabled={busy}
                onChange={(e) => setWeek(e.target.value)}
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            <strong>Allowed spices:</strong> {preferences?.spices.join(", ") || "None approved"}
          </p>
          {menu && (
            <div className="rounded-xl bg-[var(--color-warm-cream)] p-3">
              <p>
                <strong>{menu.status.replaceAll("_", " ")}</strong> · revision{" "}
                {menu.currentRevision}
              </p>
              <p>
                Chef deadline: {dateLabel(menu.submissionDeadline)} SAST{" "}
                {menu.submissionLate ? "· Late / overdue" : ""}
              </p>
              <p>
                Customer deadline: {dateLabel(menu.approvalDeadline)} SAST{" "}
                {menu.approvalLate ? "· Late / overdue" : ""}
              </p>
            </div>
          )}
          {role === "CHEF" ? (
            <MenuEditor
              key={`${pairKey}:${week}:${menu?.version ?? 0}`}
              menu={menu}
              spices={preferences?.spices ?? []}
              busy={busy}
              onSave={(items, submit) =>
                run(
                  async () => {
                    await menuApi("chef/weekly-menus", {
                      customerId: pair.customerId,
                      weekStart: week,
                      expectedVersion: menu?.version ?? 0,
                      items,
                      submit,
                    });
                  },
                  submit
                    ? "Menu submitted for customer approval."
                    : "Draft saved. It is not yet submitted for approval.",
                )
              }
            />
          ) : menu ? (
            <>
              <MealList items={menu.revisions[0]?.items ?? []} />
              {menu.status === "SENT" && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await menuApi(`account/weekly-menus/${menu.id}/approve`, {
                        expectedVersion: menu.version,
                      });
                    }, "Weekly menu approved.")
                  }
                >
                  Approve this weekly menu
                </button>
              )}
              {menu.status === "CHANGES_REQUESTED" && (
                <p>Your chef needs to revise and resubmit before you can approve.</p>
              )}
            </>
          ) : (
            <p>Your chef has not submitted a menu for this week yet.</p>
          )}
          {menu && (
            <>
              <MenuComments
                key={`${menu.id}:${menu.version}`}
                menu={menu}
                role={role}
                busy={busy}
                onComment={(body) =>
                  run(async () => {
                    await menuApi(
                      `${role === "CHEF" ? "chef" : "account"}/weekly-menus/${menu.id}/comments`,
                      { expectedVersion: menu.version, ...body },
                    );
                  }, "Comment saved.")
                }
              />
              <details>
                <summary className="cursor-pointer font-bold">Saved revision history</summary>
                {menu.revisions.map((revision) => (
                  <div key={revision.number} className="my-3 rounded-xl border p-3">
                    <h3>
                      Revision {revision.number} · {revision.submitted ? "Submitted" : "Draft"}
                      {revision.approvedAt
                        ? ` · Approved ${dateLabel(revision.approvedAt)} SAST`
                        : ""}
                    </h3>
                    <MealList items={revision.items} />
                  </div>
                ))}
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}

function MealList({ items }: { readonly items: readonly MenuItem[] }) {
  return (
    <div className="space-y-3">
      {DAYS.map((day, index) => {
        const meals = items.filter((item) => item.day === index + 1);
        return meals.length ? (
          <div key={day} className="rounded-xl border p-3">
            <h3 className="font-bold">{day}</h3>
            {meals.map((meal, i) => (
              <p key={i} className="mt-2 whitespace-pre-wrap">
                <strong>{meal.forWhom}:</strong> {meal.meal}
                <br />
                <span className="text-sm">Spices: {meal.spices.join(", ") || "None"}</span>
              </p>
            ))}
          </div>
        ) : null;
      })}
    </div>
  );
}

function MenuEditor({
  menu,
  spices,
  busy,
  onSave,
}: {
  readonly menu?: WeeklyMenu;
  readonly spices: string[];
  readonly busy: boolean;
  readonly onSave: (items: MenuItem[], submit: boolean) => Promise<void>;
}) {
  const [items, setItems] = useState<MenuItem[]>(menu?.revisions[0]?.items ?? []);
  const [expanded, setExpanded] = useState<number[]>([]);
  const update = (index: number, change: Partial<MenuItem>) =>
    setItems((previous) =>
      previous.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Click a day to add meals. Add a separate entry for each person or group. Saving any revision
        clears the current approval; submitted history is retained.
      </p>
      {DAYS.map((day, dayIndex) => {
        const number = dayIndex + 1;
        const open = expanded.includes(number);
        return (
          <div key={day} className="rounded-xl border p-3">
            <button
              type="button"
              className="w-full text-left font-bold"
              aria-expanded={open}
              aria-controls={`day-${number}`}
              disabled={busy}
              onClick={() =>
                setExpanded((previous) =>
                  open ? previous.filter((d) => d !== number) : [...previous, number],
                )
              }
            >
              {day} ({items.filter((item) => item.day === number).length} meals) {open ? "−" : "+"}
            </button>
            {open && (
              <div id={`day-${number}`} className="mt-3 space-y-4">
                {items.map((item, index) =>
                  item.day === number ? (
                    <div
                      key={index}
                      className="space-y-2 rounded-xl bg-[var(--color-warm-cream)] p-3"
                    >
                      <label className="block">
                        Who is this meal for? ({day}, meal {index + 1})
                        <input
                          className={inputClass}
                          value={item.forWhom}
                          maxLength={120}
                          disabled={busy}
                          onChange={(e) => update(index, { forWhom: e.target.value })}
                          placeholder="e.g. Mom, children, everyone"
                        />
                      </label>
                      <label className="block">
                        Menu ({day}, meal {index + 1})
                        <textarea
                          className={inputClass}
                          value={item.meal}
                          maxLength={2000}
                          disabled={busy}
                          onChange={(e) => update(index, { meal: e.target.value })}
                        />
                      </label>
                      <fieldset>
                        <legend className="text-sm font-bold">Spices for this meal</legend>
                        {[...new Set([...spices, ...item.spices])].map((spice) => (
                          <label key={spice} className="mr-3 inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={item.spices.includes(spice)}
                              onChange={(e) =>
                                update(index, {
                                  spices: e.target.checked
                                    ? [...item.spices, spice]
                                    : item.spices.filter((s) => s !== spice),
                                })
                              }
                            />
                            {spice}
                            {!spices.some((s) => s.toLowerCase() === spice.toLowerCase())
                              ? " (no longer approved — remove)"
                              : ""}
                          </label>
                        ))}
                      </fieldset>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-sm font-bold text-red-800"
                        onClick={() =>
                          setItems((previous) => previous.filter((_, i) => i !== index))
                        }
                      >
                        Remove meal
                      </button>
                    </div>
                  ) : null,
                )}
                <button
                  type="button"
                  disabled={busy || items.length >= 100}
                  className="rounded-xl border px-3 py-2 font-bold"
                  onClick={() =>
                    setItems((previous) => [
                      ...previous,
                      { day: number, forWhom: "", meal: "", spices: [] },
                    ])
                  }
                >
                  Add meal for {day}
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => void onSave(items, false)}
        >
          Save draft
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy || items.length === 0}
          onClick={() => void onSave(items, true)}
        >
          Submit for approval
        </button>
      </div>
    </div>
  );
}

function MenuComments({
  menu,
  role,
  busy,
  onComment,
}: {
  readonly menu: WeeklyMenu;
  readonly role: MenuRole;
  readonly busy: boolean;
  readonly onComment: (body: {
    body: string;
    alternative?: string;
    day?: number;
    forWhom?: string;
    requestsChanges: boolean;
  }) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [alternative, setAlternative] = useState("");
  const [day, setDay] = useState("");
  const [forWhom, setForWhom] = useState("");
  const [requestsChanges, setRequestsChanges] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <h2 className="font-bold">Comments and alternatives</h2>
      {menu.comments.map((comment) => (
        <div key={comment.id} className="rounded-xl bg-[var(--color-warm-cream)] p-3">
          <p>
            <strong>{comment.author.displayName}</strong> · revision {comment.revision}
            {comment.day ? ` · ${DAYS[comment.day - 1]}` : ""}
            {comment.forWhom ? ` · ${comment.forWhom}` : ""}
            {comment.requestsChanges ? " · Changes requested" : ""}
          </p>
          <p className="whitespace-pre-wrap">{comment.body}</p>
          {comment.alternative && (
            <p className="whitespace-pre-wrap">Alternative: {comment.alternative}</p>
          )}
        </div>
      ))}
      <label className="block">
        Comment
        <textarea
          className={inputClass}
          disabled={busy}
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <label className="block">
        Alternative suggestion (optional)
        <textarea
          className={inputClass}
          disabled={busy}
          value={alternative}
          maxLength={2000}
          onChange={(e) => setAlternative(e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Day (optional)
          <select
            className={inputClass}
            disabled={busy}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            <option value="">Whole week</option>
            {DAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          For whom (optional)
          <input
            className={inputClass}
            disabled={busy}
            value={forWhom}
            maxLength={120}
            onChange={(e) => setForWhom(e.target.value)}
          />
        </label>
      </div>
      {role === "CUSTOMER" && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={requestsChanges}
            disabled={busy}
            onChange={(e) => setRequestsChanges(e.target.checked)}
          />
          Request chef changes (requires revision and fresh approval)
        </label>
      )}
      <button
        type="button"
        className={buttonClass}
        disabled={busy || !body.trim()}
        onClick={() =>
          void onComment({
            body,
            alternative,
            ...(day ? { day: Number(day) } : {}),
            ...(forWhom.trim() ? { forWhom } : {}),
            requestsChanges,
          })
        }
      >
        {requestsChanges ? "Send change request" : "Send comment"}
      </button>
    </div>
  );
}
