/**
 * Sanitizes and converts absolute upload URLs to relative URLs if they contain '/uploads/'.
 * This ensures that if the application domain changes, uploaded assets remain fully accessible.
 */
export function makeUrlRelative(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.indexOf("/uploads/");
  if (match !== -1) {
    return url.substring(match);
  }
  return url;
}
