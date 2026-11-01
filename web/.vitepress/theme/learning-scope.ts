// A scope is fixed for this document lifetime. Login/logout reload only after
// flushing editors, so unmount/pagehide writes can never cross account boundaries.
export const learningScope = (() => {
  if (typeof sessionStorage === "undefined") return "";
  try {
    const session = JSON.parse(
      sessionStorage.getItem("plex-account") || "null",
    );
    return Number.isInteger(session?.id) && session.id > 0
      ? `user:${session.id}:`
      : "";
  } catch {
    return "";
  }
})();
export const learningKey = (id: string) => learningScope + id;
export const localLearningKey = (id: string) => "plex:" + learningKey(id);
