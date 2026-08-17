/**
 * Going back to where you actually came from.
 *
 * A hardcoded back link is a guess, and it is usually wrong. Leaving a
 * conversation sent people to the account page because that is what the link
 * said — never mind that they had arrived from the members directory, or from
 * someone's profile, or from a notification. The browser already knows the
 * answer; the only thing missing was asking it.
 *
 * `history.back()` alone is not safe: on the first page of a visit there is
 * nothing behind us but the site someone came from, or a blank tab, and
 * sending them there is worse than any fallback. So in-app navigations are
 * counted, and history is only used when it is ours to walk back through.
 */

let inAppNavigations = 0;

/** Called once per client-side route change. */
export function noteNavigation(): void {
  inAppNavigations += 1;
}

/** True when there is a previous screen inside this site to return to. */
export function canGoBack(): boolean {
  return inAppNavigations > 1;
}

/**
 * Return to the previous screen, or to `fallback` when this was the entry
 * point (opened from a link, a notification, or a fresh tab).
 */
export function goBack(fallback: string, navigate: (to: string) => void): void {
  if (canGoBack()) {
    inAppNavigations -= 1;
    window.history.back();
    return;
  }
  navigate(fallback);
}
