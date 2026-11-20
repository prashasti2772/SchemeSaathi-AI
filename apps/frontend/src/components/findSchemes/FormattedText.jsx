import React from "react";

/**
 * Parses basic Markdown (bold, headers, bullet points, links) 
 * into clean React elements without heavy external dependencies.
 */
export default function FormattedText({ content = "" }) {
  if (!content) return null;

  const lines = content.split("\n");

  const renderFormattedInline = (text) => {
    // Regex for bold **text** and markdown links [label](url)
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check for link [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Check for bold **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      let firstMatch = null;
      let matchType = null;

      if (linkMatch && boldMatch) {
        if (linkMatch.index < boldMatch.index) {
          firstMatch = linkMatch;
          matchType = "link";
        } else {
          firstMatch = boldMatch;
          matchType = "bold";
        }
      } else if (linkMatch) {
        firstMatch = linkMatch;
        matchType = "link";
      } else if (boldMatch) {
        firstMatch = boldMatch;
        matchType = "bold";
      }

      if (!firstMatch) {
        parts.push(remaining);
        break;
      }

      const matchIndex = firstMatch.index;
      if (matchIndex > 0) {
        parts.push(remaining.substring(0, matchIndex));
      }

      if (matchType === "bold") {
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-[#172b49]">
            {firstMatch[1]}
          </strong>
        );
        remaining = remaining.substring(matchIndex + firstMatch[0].length);
      } else if (matchType === "link") {
        parts.push(
          <a
            key={`l-${keyIdx++}`}
            href={/^https?:\/\//i.test(firstMatch[2]) ? firstMatch[2] : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#0d2b55] underline hover:text-[#9b7815]"
          >
            {firstMatch[1]}
          </a>
        );
        remaining = remaining.substring(matchIndex + firstMatch[0].length);
      }
    }

    return parts;
  };

  return (
    <div className="space-y-1.5 text-[11px] leading-5 text-slate-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Header ###
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-[12px] font-bold text-[#172b49] mt-2 mb-1">
              {renderFormattedInline(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-[13px] font-extrabold text-[#172b49] mt-2.5 mb-1">
              {renderFormattedInline(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }

        // Bullet point - or *
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#d7aa2d] font-bold select-none">•</span>
              <span className="flex-1">{renderFormattedInline(trimmed.substring(2))}</span>
            </div>
          );
        }

        return <p key={idx}>{renderFormattedInline(trimmed)}</p>;
      })}
    </div>
  );
}
