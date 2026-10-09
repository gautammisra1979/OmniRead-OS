/**
 * Splits a bare address or a `Name <address>` string (the form sendEmail() and
 * the Test Email action build) into its parts. `name` is omitted when empty.
 */
export function parseAddress(value: string): { name?: string; address: string } {
  const match = /^(.*)<([^<>]*)>\s*$/.exec(value.trim());
  if (!match) return { address: value.trim() };
  const name = match[1].trim().replace(/^"(.*)"$/, "$1").trim();
  const address = match[2].trim();
  return name ? { name, address } : { address };
}
