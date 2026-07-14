// Bundles the React (preact/compat) xApp into a single self-contained HTML
// file that can be pasted straight into the Cognigy "xApp: Show HTML" node.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const result = await build({
    entryPoints: ["src/main.tsx"],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2019",
    jsx: "automatic",
    // React source, Preact runtime: keeps the pasted payload ~15 KB instead of ~140 KB
    alias: {
        "react": "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/client": "preact/compat/client"
    },
    write: false
});

const bundle = result.outputFiles[0].text;
// "</script>" inside the JS would terminate the inline <script> tag early
const safeBundle = bundle.replace(/<\/script>/gi, "<\\/script>");
const template = readFileSync("template.html", "utf8");
const html = template.replace("/*__BUNDLE__*/", safeBundle);

mkdirSync("dist", { recursive: true });
writeFileSync("dist/rma-form.html", html);
console.log(`dist/rma-form.html written (${(html.length / 1024).toFixed(1)} KB)`);
