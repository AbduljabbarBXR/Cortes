import { useEffect, useRef, useState } from "react";

import { diffLines, type CodeFile } from "./lib/files";

interface Props {
  files: CodeFile[];
  active: string | null;
  streaming: boolean;
  prev: CodeFile[];
}

export default function CodeEditor({ files, active, streaming, prev }: Props) {
  const [tab, setTab] = useState<string | null>(null);
  const [dots, setDots] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => clearInterval(t);
  }, []);

  const tabName = tab ?? active ?? files[0]?.name ?? null;

  useEffect(() => {
    if (streaming && active) setTab(active);
  }, [active, streaming]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [files, tabName, streaming]);

  const file = files.find((f) => f.name === tabName) ?? null;
  const prevFile = file ? prev.find((p) => p.name === file.name) : null;
  const showDiff = !!prevFile && !!file && !streaming && prevFile.content !== file.content;
  const lines = file
    ? showDiff && prevFile
      ? diffLines(prevFile.content, file.content)
      : file.content
          .replace(/\n$/, "")
          .split("\n")
          .map((text, i) => ({ text, kind: "same" as const, oldNo: i + 1, newNo: i + 1 }))
    : [];

  return (
    <div className="editorView">
      <div className="editorTabs">
        {files.length === 0 && <span className="editorEmptyTab">waiting for files…</span>}
        {files.map((f) => (
          <button
            key={f.name}
            className={`editorTab ${f.name === tabName ? "editorTabActive" : ""}`}
            onClick={() => setTab(f.name)}
          >
            {f.name}
            {prev.some((p) => p.name === f.name && p.content !== f.content) && (
              <span className="editorChangedDot" title="changed" />
            )}
          </button>
        ))}
      </div>
      <div className="editorBody">
        {file ? (
          <div className="editorLines">
            {lines.map((ln, i) => (
              <div
                key={i}
                className={`editorLine ${ln.kind === "add" ? "diffAdd" : ln.kind === "del" ? "diffDel" : ""}`}
              >
                <span className="editorLineNo">{ln.kind === "del" ? ln.oldNo || "" : ln.newNo || ""}</span>
                <span className="editorLineText">{ln.text || " "}</span>
              </div>
            ))}
            {streaming && !file.done && (
              <div className="editorLine">
                <span className="editorLineNo" />
                <span className="editorCursor" />
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="editorEmpty">
            <p>Crafting{".".repeat(dots)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
