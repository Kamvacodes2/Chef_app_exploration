import { readApiErrorMessage } from "@/lib/apiError";
import { getChefmateApiUrl } from "@/lib/env";

export type WaitlistServiceFrequency = "ONCE_A_WEEK" | "TWICE_A_WEEK" | "FOUR_TIMES_A_WEEK";

export interface JoinWaitlistInput {
  readonly displayName: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly serviceFrequency: WaitlistServiceFrequency;
}

export interface JoinWaitlistOptions {
  readonly fetchImpl?: typeof fetch;
}

export async function joinWaitlist(
  input: JoinWaitlistInput,
  options: JoinWaitlistOptions = {},
): Promise<void> {
  const response = await (options.fetchImpl ?? fetch)(`${getChefmateApiUrl()}/api/v1/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(
        response,
        "Could not join the waiting list right now. Please try again.",
      ),
    );
  }
}
