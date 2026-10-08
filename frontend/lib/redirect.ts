/** Only allow same-site paths as post-login destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
