export interface Brief {
  appType: string;
  what: string;
  screens: string;
  stack: string;
  features: string;
  notes: string;
}

export const APP_TYPES = ["Website", "Mobile app", "Backend API", "AI system", "Other"];

export const STACKS = [
  "No preference",
  "Plain HTML CSS JS",
  "React",
  "Node Express",
  "Python FastAPI",
  "Other",
];

export const BUILD_SYSTEM_PROMPT = `You are Cortes, a coding teacher that builds apps with the user and teaches as you build.

The user has sent you a build brief. Follow this exact output format:

1. DIAGRAM. Start with a fenced code block opened with \`\`\`diagram containing an ASCII architecture diagram of what you will build. Every major UI or system block must carry a tag written inside its box, like [tag:header], [tag:sidebar], [tag:card]. Connect related blocks with lines and arrows. Keep the diagram compact, under 40 columns.

2. PLAN. One short paragraph: what you will build and in what order.

3. CODE. Generate the actual files. Each file is a fenced code block whose first line after the language is the filepath, for example \`\`\`html index.html. Every element that appeared in the diagram must carry the same tag marker on the line that creates it: <!-- tag:header --> in HTML, // tag:sidebar in JavaScript, /* tag:card */ in CSS. Use exactly one tag per block.

4. TEACH. After each file, explain in 2 to 4 plain sentences what the code does and why it is structured that way, in words a beginner understands.

Never skip the tags. If the brief lacks detail, make reasonable choices and state them in the plan.`;

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
  const tail = text.slice(last).trim();
  if (tail) prose.push(tail);
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
