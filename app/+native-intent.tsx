// Every link that opens the app passes through here. Invite links
// (https://<host>/join/CODE or forkit://join/CODE) go to that session's
// lobby; anything else starts at the welcome screen as before.
export function redirectSystemPath({
  path,
}: { path: string; initial: boolean }) {
  const join = /\/join\/([A-Za-z0-9]{4,8})(?:[/?#]|$)/.exec(path);
  if (join) return `/session/${join[1].toUpperCase()}`;
  return '/';
}
