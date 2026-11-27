// Every link that opens the app passes through here. Invite links
// (https://<host>/join/CODE or forkit://join/CODE) open the shared swipe deck.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const room = /(?:^|\/)(?:join|swipe|session)\/([A-Za-z0-9]{4,8})(?:[/?#]|$)/.exec(path);
  return room ? `/swipe/${room[1].toUpperCase()}` : "/";
}
