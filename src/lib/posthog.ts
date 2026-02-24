import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!import.meta.env.VITE_POSTHOG_KEY) return;

  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    person_profiles: "identified_only",
  });
}

export { posthog };
