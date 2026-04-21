import posthog from "posthog-js";

import { env } from "@/lib/env";

let initialized = false;

export function initPosthogBrowser() {
  if (typeof window === "undefined") {
    return;
  }

  if (initialized || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST
  });

  initialized = true;
}
