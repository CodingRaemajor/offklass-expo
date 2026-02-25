// lib/mathFallback.ts
import { create, all } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve";
import "nerdamer/Algebra";
import "nerdamer/Calculus";

const math = create(all, {
  number: "number",
  precision: 64,
});

function normalize(raw: string) {
  return raw
    .trim()
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−]/g, "-")
    .replace(/\s+/g, " ");
}

// Quick “is this even math?” check.
// If false -> return null so LLM handles it.
function looksLikeMath(s: string) {
  return /[\d]/.test(s) && /[+\-*/^()=]|sqrt|log|ln|sin|cos|tan|pi|π/i.test(s);
}

// Avoid allowing unsafe tokens in mathjs (extra safety)
function containsUnsafeTokens(s: string) {
  return /import|createUnit|evaluate\(|parse\(|typed\(|simplify\(|derivative\(|resolve|function\s*\(|=>|{|}|\[|\]|;|:|new\s+/i.test(
    s
  );
}

function formatOffklass(problem: string, steps: string[], answer: string) {
  const stepLines = steps.map((s, i) => `- Step ${i + 1}: ${s}`).join("\n");
  return `Problem: ${problem}\n\nSteps:\n${stepLines}\n\nAnswer: ${answer}`;
}

function prettyNumber(x: any): string | null {
  try {
    // mathjs may return number, BigNumber, Fraction, Complex, etc.
    const v = typeof x?.valueOf === "function" ? x.valueOf() : x;

    // Complex not supported for school mode
    if (v && typeof v === "object" && ("re" in v || "im" in v)) return null;

    if (typeof v === "number") {
      if (!Number.isFinite(v)) return null;
      // trim floating noise
      const rounded = Math.round(v * 1e12) / 1e12;
      return String(rounded);
    }

    if (typeof v === "string") return v;

    // last resort
    const s = String(v);
    if (!s || s === "undefined" || s === "null") return null;
    return s;
  } catch {
    return null;
  }
}

// If user writes sin(30) (common in school), interpret as degrees when it’s a simple number.
// Only rewrites trig calls where the inside is just a number (no variables).
function injectDegreesForSimpleTrig(expr: string) {
  return expr.replace(
    /\b(sin|cos|tan)\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/gi,
    (_m, fn, num) => `${fn}(${num} deg)`
  );
}

// Choose a variable to solve for (x by default)
function pickSolveVar(eqn: string): string {
  const vars = ["x", "y", "t", "n", "k"];
  for (const v of vars) {
    if (new RegExp(`\\b${v}\\b`, "i").test(eqn)) return v;
  }
  return "x";
}

export function tryMathFallback(userText: string): string | null {
  const original = userText.trim();
  let input = normalize(original);

  if (!looksLikeMath(input)) return null;
  if (containsUnsafeTokens(input)) return null;

  // Replace π with pi for mathjs/nerdamer
  input = input.replace(/π/g, "pi");

  // Support ln(...) as natural log
  input = input.replace(/\bln\s*\(/gi, "log(");

  // Interpret simple trig like sin(30) as degrees
  input = injectDegreesForSimpleTrig(input);

  // -----------------------------
  // 1) EQUATIONS (contains "=")
  // -----------------------------
  if (input.includes("=")) {
    try {
      const variable = pickSolveVar(input);

      // nerdamer.solve returns solutions set sometimes: "[2,3]"
      const sol = (nerdamer as any).solve(input, variable).toString();

      const steps = [
        "This is an equation because it has an equals sign (=).",
        `Solve for ${variable}.`,
        `${variable} = ${sol}`,
      ];

      return formatOffklass(original, steps, `${variable} = ${sol}`);
    } catch {
      return null;
    }
  }

  // -----------------------------
  // 2) EXPRESSIONS (evaluate)
  // -----------------------------
  try {
    const value = math.evaluate(input);
    const pretty = prettyNumber(value);
    if (pretty == null) return null;

    const steps = [
      "Keep the same numbers and symbols.",
      `Compute: ${input}`,
      `Result = ${pretty}`,
    ];

    return formatOffklass(original, steps, pretty);
  } catch {
    return null;
  }
}