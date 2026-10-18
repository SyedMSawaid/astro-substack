import TurndownService from "turndown";
// @ts-expect-error no types shipped
import { gfm } from "turndown-plugin-gfm";

export function createConverter() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  td.use(gfm);

  // Substack UI chrome that isn't content.
  td.remove((node) => {
    const cls = (node as HTMLElement).getAttribute?.("class") ?? "";
    return /subscription-widget|subscribe-widget|button-wrapper|share-widget|post-ufi/.test(cls);
  });

  // Images wrapped in a link to the full-size image: keep just the image.
  td.addRule("imageLink", {
    filter: (node) =>
      node.nodeName === "A" && /\bimage-link\b/.test(node.getAttribute("class") ?? ""),
    replacement: (content) => content,
  });

  td.addRule("figure", {
    filter: "figure",
    replacement: (content) => `\n\n${content.trim()}\n\n`,
  });

  td.addRule("figcaption", {
    filter: "figcaption",
    replacement: (content) => (content.trim() ? `*${content.trim()}*\n\n` : ""),
  });

  // Embedded media: keep a link rather than losing it silently.
  td.addRule("iframe", {
    filter: "iframe",
    replacement: (_c, node) => {
      const src = (node as HTMLElement).getAttribute("src");
      return src ? `\n\n[Embedded content](${src})\n\n` : "";
    },
  });

  // Prefer the original image URL stored in data-attrs over the CDN-resized src.
  td.addRule("img", {
    filter: "img",
    replacement: (_c, node) => {
      const el = node as HTMLElement;
      let src = el.getAttribute("src") ?? "";
      try {
        const attrs = JSON.parse(el.getAttribute("data-attrs") ?? "{}");
        if (attrs.src) src = attrs.src;
      } catch {}
      if (!src) return "";
      const alt = (el.getAttribute("alt") ?? "").replace(/[\[\]]/g, "");
      return `![${alt}](${src})`;
    },
  });

  return (html: string) => td.turndown(html).trim() + "\n";
}

export function yamlString(value: string): string {
  return JSON.stringify(value);
}
