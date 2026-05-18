import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(resolve(root, "docs/benchmarks.json"), "utf8"));

const rows = data.cases.map((item) => {
  const lightcodeTokens = estimateTokens(item.lightcode);
  const reactTokens = estimateTokens(item.react);
  const htmlTokens = estimateTokens(item.html);
  const vsReact = savings(lightcodeTokens, reactTokens);
  const vsHTML = savings(lightcodeTokens, htmlTokens);
  return {
    name: item.name,
    lightcodeTokens,
    reactTokens,
    htmlTokens,
    vsReact,
    vsHTML
  };
});

console.table(rows.map((row) => ({
  case: row.name,
  lightcode: row.lightcodeTokens,
  react: row.reactTokens,
  html: row.htmlTokens,
  "save vs react": `${row.vsReact}%`,
  "save vs html": `${row.vsHTML}%`
})));

const averageReactSavings = Math.round(rows.reduce((sum, row) => sum + row.vsReact, 0) / rows.length);
const averageHTMLSavings = Math.round(rows.reduce((sum, row) => sum + row.vsHTML, 0) / rows.length);
console.log(`Average savings vs React: ${averageReactSavings}%`);
console.log(`Average savings vs HTML: ${averageHTMLSavings}%`);

if (averageReactSavings < 60 || averageHTMLSavings < 30) {
  throw new Error("LensUI benchmark savings dropped below the documented floor");
}

function estimateTokens(value) {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function savings(lightcode, baseline) {
  return Math.max(0, Math.round((1 - lightcode / baseline) * 100));
}
