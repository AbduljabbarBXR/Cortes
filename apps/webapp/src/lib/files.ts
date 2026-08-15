export interface CodeFile {
  name: string;
  lang: string;
  content: string;
  done: boolean;
}

export interface DiffLine {
  text: string;
  kind: "same" | "add" | "del";
  oldNo: number;
  newNo: number;
}

/**
 * Parses model markdown output into files, tolerating an unterminated
 * trailing fence so the editor can stream content in real time.
 * Fences are ```lang title blocks; diagram blocks and prose are skipped.
 */
export function parseStreamedFiles(text: string): {
  files: CodeFile[];
  activeName: string | null;
} {
  const files: CodeFile[] = [];
  const parts = text.split("```");
  let activeName: string | null = null;
  for (let i = 1; i < parts.length; i += 2) {
    const part = parts[i];
    const nl = part.indexOf("\n");
    const head = nl < 0 ? part : part.slice(0, nl);
    const body = nl < 0 ? "" : part.slice(nl + 1);
    const tokens = head.trim().split(/\s+/);
    const lang = (tokens[0] ?? "").toLowerCase();
    const title = tokens.slice(1).join(" ");
    const name = title || (lang ? `file.${lang}` : "");
    if (!name || lang === "diagram") continue;
    const closed = i + 1 < parts.length;
    files.push({
      name,
      lang,
      content: closed ? body.replace(/\n$/, "") : body,
      done: closed,
    });
    if (!closed) activeName = name;
  }
  return { files, activeName };
}

/**
 * Greedy line diff: same lines are kept in order, changed lines are marked
 * add or del, each with its 1 based old and new line number (0 when absent).
 * Trailing newlines are ignored so no phantom empty line appears.
 * Lines are matched ignoring whitespace, so models that re emit a file with
 * formatting drift do not show the whole file as rewritten.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const b = before.split("\n");
  const a = after.split("\n");
  if (b[b.length - 1] === "") b.pop();
  if (a[a.length - 1] === "") a.pop();
  const eq = (x: string, y: string) => x.replace(/\s+/g, "") === y.replace(/\s+/g, "");
  const findInB = (from: number, line: string) => {
    for (let i = from; i < b.length; i++) if (eq(b[i], line)) return i;
    return -1;
  };
  const findInA = (from: number, line: string) => {
    for (let i = from; i < a.length; i++) if (eq(a[i], line)) return i;
    return -1;
  };
  const out: DiffLine[] = [];
  let bi = 0;
  let ai = 0;
  const same = () => {
    out.push({ text: a[ai], kind: "same", oldNo: bi + 1, newNo: ai + 1 });
    bi++;
    ai++;
  };
  const del = () => {
    out.push({ text: b[bi], kind: "del", oldNo: bi + 1, newNo: 0 });
    bi++;
  };
  const add = () => {
    out.push({ text: a[ai], kind: "add", oldNo: 0, newNo: ai + 1 });
    ai++;
  };
  while (ai < a.length || bi < b.length) {
    if (ai < a.length && bi < b.length && eq(b[bi], a[ai])) {
      same();
    } else if (ai >= a.length) {
      del();
    } else if (bi >= b.length) {
      add();
    } else {
      const inB = findInB(bi, a[ai]);
      const inA = findInA(ai, b[bi]);
      if (inB === -1 && inA === -1) {
        del();
      } else if (inB !== -1 && (inA === -1 || inB - bi <= inA - ai)) {
        del();
      } else {
        add();
      }
    }
  }
  return out;
}
