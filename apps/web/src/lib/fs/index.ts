export type FsNode =
  | { type: "file"; name: string; content: () => string }
  | { type: "directory"; name: string; children: Record<string, FsNode> };

const HOME_SEGMENTS = ["home", "notpelos"];
const HOME_PATH = "/home/notpelos";

/** Expand `~` to the absolute home path */
function expandTilde(path: string): string {
  if (path === "~") return HOME_PATH;
  if (path.startsWith("~/")) return HOME_PATH + path.slice(1);
  return path;
}

/**
 * Resolve a path (absolute or relative) against cwd segments.
 * Returns the normalized absolute path segments or null if it goes above root.
 */
export function resolvePath(path: string, cwd: string[]): string[] | null {
  const expanded = expandTilde(path);
  const isAbsolute = expanded.startsWith("/");
  const base = isAbsolute ? [] : [...cwd];
  const parts = expanded.replace(/^\//, "").split("/").filter(Boolean);

  const result = [...base];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (result.length === 0) return null; // above root
      result.pop();
    } else {
      result.push(part);
    }
  }
  return result;
}

/** Convert path segments to a display string (with ~ substitution for home) */
export function formatPath(segments: string[]): string {
  const abs = "/" + segments.join("/");
  if (abs === HOME_PATH || abs === HOME_PATH + "/") return "~";
  if (abs.startsWith(HOME_PATH + "/")) return "~/" + abs.slice(HOME_PATH.length + 1);
  return abs || "/";
}

/** Walk the virtual filesystem to find a node by path segments. Returns null if not found. */
export function getNode(
  segments: string[],
  rootChildren: Record<string, FsNode>
): FsNode | null {
  if (segments.length === 0) {
    // Return a synthetic root directory
    return { type: "directory", name: "/", children: rootChildren };
  }

  let current: FsNode | null = {
    type: "directory",
    name: "/",
    children: rootChildren,
  };

  for (const seg of segments) {
    if (!current || current.type !== "directory") return null;
    // Path segments come from resolvePath (controlled), not raw user input.
    // eslint-disable-next-line security/detect-object-injection
    const child: FsNode | undefined = current.children[seg];
    if (child === undefined) return null;
    current = child;
  }

  return current;
}

export { HOME_SEGMENTS };
