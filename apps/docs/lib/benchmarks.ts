import benchmarkData from "../../../docs/benchmarks.json";

export type BenchmarkCase = {
  id: string;
  name: string;
  surface: string;
  react: string;
  html: string;
  lightcode: string;
};

export type BenchmarkResult = BenchmarkCase & {
  reactTokens: number;
  htmlTokens: number;
  lightcodeTokens: number;
  reactSavings: number;
  htmlSavings: number;
  lightcodeLines: number;
};

export const benchmarkCases = benchmarkData.cases as BenchmarkCase[];

export const benchmarkResults: BenchmarkResult[] = benchmarkCases.map((item) => {
  const reactTokens = estimateTokens(item.react);
  const htmlTokens = estimateTokens(item.html);
  const lightcodeTokens = estimateTokens(item.lightcode);
  return {
    ...item,
    reactTokens,
    htmlTokens,
    lightcodeTokens,
    reactSavings: savings(lightcodeTokens, reactTokens),
    htmlSavings: savings(lightcodeTokens, htmlTokens),
    lightcodeLines: item.lightcode.trim().split("\n").length
  };
});

export const benchmarkSummary = {
  averageReactSavings: Math.round(average(benchmarkResults.map((item) => item.reactSavings))),
  averageHTMLSavings: Math.round(average(benchmarkResults.map((item) => item.htmlSavings))),
  averageLightcodeTokens: Math.round(average(benchmarkResults.map((item) => item.lightcodeTokens))),
  caseCount: benchmarkResults.length
};

export function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 4));
}

function savings(lightcodeTokens: number, baselineTokens: number): number {
  return Math.max(0, Math.round((1 - lightcodeTokens / baselineTokens) * 100));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
