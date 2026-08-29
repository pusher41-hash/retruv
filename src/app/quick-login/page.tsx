import { notFound } from "next/navigation";
import QuickLoginClient from "./quick-login-client";

/**
 * Dev-only convenience: one-click login as a seeded demo account, with the
 * shared demo password shown in plain text on the page — including the
 * admin account. This was reachable in production with no gate at all,
 * meaning anyone who found the URL could become an admin on the live
 * database (which is also the same database backing every real user's
 * declarations, not a separate sandbox — see project memory). Real 404 in
 * production via `notFound()`, not just a hidden button, so the route
 * doesn't quietly work again if someone guesses it or bypasses client JS.
 */
export default function QuickLoginPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <QuickLoginClient />;
}
