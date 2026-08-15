export interface Brief {
  appType: string;
  what: string;
  screens: string;
  stack: string;
  features: string;
  notes: string;
}

export const APP_TYPES = ["Website", "Backend API", "AI system", "Other"];

export const STACKS = [
  "No preference",
  "Plain HTML CSS JS",
  "React",
  "Node Express",
  "Python FastAPI",
  "Other",
];

export const BUILD_SYSTEM_PROMPT = `You are Cortes, a coding teacher that builds apps with the user and teaches as you build.

The user has sent you a build brief. Build the app ONE PHASE PER RESPONSE. Never build everything at once. The user must be able to see exactly what changed in each phase.

THIS RESPONSE IS PHASE 1: build only the hero section. The hero is the first thing a visitor sees: a headline, a one line subtext, and a primary call to action button. Create only the files this phase needs and keep them small.

Follow this exact output format:
1. DIAGRAM. Start with a fenced code block opened with \`\`\`diagram containing an ASCII diagram of the hero. Every block carries a tag inside its box, like [tag:hero-headline], [tag:hero-cta]. Keep the diagram compact, under 40 columns.
2. PLAN. One short paragraph: what this phase builds and in what order.
3. CODE. Generate the files. Each file is a fenced code block whose first line after the language is the filepath, for example \`\`\`html index.html. Every element that appeared in the diagram must carry the same tag marker on the line that creates it: <!-- tag:hero --> in HTML, // tag:hero in JavaScript, /* tag:hero */ in CSS. Use exactly one tag per block.
4. TEACH. After each file, explain in 2 to 4 plain sentences what the code does and why it is structured that way, in words a beginner understands.

End the response with the line: Phase 1 complete. Reply "next" to build the next phase (features section, then details, then footer).

For later phases: skip the diagram unless the architecture changes, show only the files that change, and keep the same output style.

When the user requests a change to existing code, modify ONLY the lines that need to change. Keep every other line byte identical, including indentation, quotes, spacing, and casing. Never regenerate a file the change does not touch, and never restyle or reformat files you were not asked to change.`;

export function buildBrief(b: Brief): string {
  const parts: string[] = [];
  parts.push(`Build a ${b.appType}${b.what ? ` that ${b.what}` : ""}.`);
  if (b.screens.trim()) parts.push(`Pages or screens: ${b.screens.trim()}.`);
  if (b.stack.trim() && b.stack !== "No preference") parts.push(`Stack: ${b.stack.trim()}.`);
  if (b.features.trim()) parts.push(`Features: ${b.features.trim()}.`);
  if (b.notes.trim()) parts.push(`Notes: ${b.notes.trim()}.`);
  return parts.join("\n\n");
}

export interface Fence {
  lang: string;
  title: string;
  code: string;
  tags: string[];
}

export interface Scaffold {
  prose: string[];
  fences: Fence[];
  diagramTags: string[];
  allTags: string[];
  diagramText: string;
}

/** Splits assistant output into prose paragraphs and tagged code fences. */
export function parseFences(text: string): { prose: string[]; fences: Fence[]; diagramText: string } {
  const prose: string[] = [];
  const fences: Fence[] = [];
  const diagramBlocks: string[] = [];
  const re = /```([a-z0-9]*)\s*\n([^\n]*)\n([\s\S]*?)```/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) prose.push(before);
    const lang = (m[1] || "").toLowerCase();
    const title = m[2].trim();
    const code = m[3].replace(/\n$/, "");
    const tags = Array.from(new Set([...code.matchAll(/tag:([\w-]+)/gi)].map((x) => x[1])));
    if (lang === "diagram") {
      diagramBlocks.push(code);
    } else if (code.trim()) {
      fences.push({ lang, title, code, tags });
    }
    last = re.lastIndex;
  }
  const tail = text.slice(last);
  if (tail.trim().startsWith("```")) {
    const open = tail.match(/```([a-z0-9]*)\s*\n([^\n]*)\n([\s\S]*)$/i);
    if (open) {
      const lang = (open[1] || "").toLowerCase();
      const code = open[3].replace(/\n$/, "");
      const tags = Array.from(new Set([...code.matchAll(/tag:([\w-]+)/gi)].map((x) => x[1])));
      if (lang === "diagram") {
        diagramBlocks.push(code);
      } else if (code.trim()) {
        fences.push({ lang, title: open[2].trim(), code, tags });
      }
    }
  } else if (tail.trim()) {
    prose.push(tail);
  }
  return { prose, fences, diagramText: diagramBlocks.join("\n\n") };
}

/** Extracts tag names from ```diagram ASCII blocks ([tag:x] boxes and #x labels). */
export function parseDiagramTags(text: string): string[] {
  const tags = new Set<string>();
  const re = /```diagram\s*\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    for (const t of m[1].matchAll(/\[(?:tag:)?([\w-]+)\]/g)) tags.add(t[1]);
    for (const t of m[1].matchAll(/#([\w-]+)/g)) tags.add(t[1]);
  }
  return [...tags];
}

export function parseScaffold(text: string): Scaffold {
  const { prose, fences, diagramText } = parseFences(text);
  const diagramTags = parseDiagramTags(text);
  const allTags = [...new Set([...diagramTags, ...fences.flatMap((f) => f.tags)])];
  return { prose, fences, diagramTags, allTags, diagramText };
}

/** Strips tag markers so code shown to the user stays clean. */
export function stripTags(code: string): string {
  return code
    .replace(/<!--\s*tag:[\w-]+\s*-->/g, "")
    .replace(/\/\/\s*tag:[\w-]+/g, "")
    .replace(/\/\*\s*tag:[\w-]+\s*\*\//g, "");
}
