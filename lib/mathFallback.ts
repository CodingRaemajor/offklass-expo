// lib/mathFallback.ts

type Op = "+" | "-" | "x" | "×" | "*" | "÷" | "/";

function normalize(input: string) {
  return input
    .trim()
    .replace(/[×]/g, "x")
    .replace(/[÷]/g, "/")
    .replace(/[−]/g, "-")
    .replace(/\s+/g, " ");
}

function padLeft(s: string, width: number) {
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

function boardBlock(lines: string[]) {
  return "```\n" + lines.join("\n") + "\n```";
}

function isInt(n: number) {
  return Number.isFinite(n) && Number.isInteger(n);
}

// Format stacked + or -
function makeAddSubBoard(a: number, b: number, op: "+" | "-") {
  const A = String(a);
  const B = String(b);
  const w = Math.max(A.length, B.length) + 2;

  const top = padLeft(A, w);
  const mid = op + padLeft(B, w - 1);
  const line = "-".repeat(w);

  if (op === "+") {
    const onesA = Math.abs(a) % 10;
    const onesB = Math.abs(b) % 10;
    const tensA = Math.floor(Math.abs(a) / 10);
    const tensB = Math.floor(Math.abs(b) / 10);

    const onesSum = onesA + onesB;
    const carry = onesSum >= 10 ? 1 : 0;
    const onesWrite = onesSum % 10;

    const tensSum = tensA + tensB + carry;

    const result = a + b;

    const blank = padLeft("__", w);
    const afterOnes = padLeft(String(onesWrite), w);
    const final = padLeft(String(result), w);

    const steps: string[] = [
      top,
      mid,
      line,
      blank,
      "",
      `First: ones: ${onesA} plus ${onesB} is ${onesSum}`,
      `Write: ${onesWrite}`,
      "",
      top,
      mid,
      line,
      afterOnes,
      "",
      carry ? `Next: carry 1 to tens` : `Next: no carry`,
      `Then: tens: ${tensA} plus ${tensB}${carry ? " plus 1" : ""} is ${tensSum}`,
      `Write: ${tensSum}`,
      "",
      top,
      mid,
      line,
      final,
    ];

    return steps;
  }

  // subtraction (simple borrow for 2-digit; if bigger, still works with math)
  const result = a - b;

  // basic borrow only if both are 0-99
  if (a >= 0 && b >= 0 && a <= 99 && b <= 99) {
    const onesA = a % 10;
    const onesB = b % 10;
    const tensA = Math.floor(a / 10);
    const tensB = Math.floor(b / 10);

    let borrow = 0;
    let onesTop = onesA;
    let tensTop = tensA;

    if (onesA < onesB) {
      borrow = 1;
      onesTop = onesA + 10;
      tensTop = tensA - 1;
    }

    const onesDiff = onesTop - onesB;
    const tensDiff = tensTop - tensB;

    const blank = padLeft("__", w);
    const afterOnes = padLeft(String(onesDiff), w);
    const final = padLeft(String(result), w);

    const steps: string[] = [
      top,
      mid,
      line,
      blank,
      "",
      borrow
        ? `First: borrow 1 ten, ones becomes ${onesTop}`
        : `First: no borrow`,
      `Next: ones: ${onesTop} take away ${onesB} is ${onesDiff}`,
      `Write: ${onesDiff}`,
      "",
      top,
      mid,
      line,
      afterOnes,
      "",
      `Then: tens: ${tensTop} take away ${tensB} is ${tensDiff}`,
      `Write: ${tensDiff}`,
      "",
      top,
      mid,
      line,
      final,
    ];

    return steps;
  }

  // fallback subtraction steps (still board-like)
  const steps: string[] = [
    top,
    mid,
    line,
    padLeft(String(result), w),
  ];
  return steps;
}

// Format multiplication (simple, no long partial products — kid style)
function makeMulBoard(a: number, b: number) {
  const A = String(a);
  const B = String(b);
  const w = Math.max(A.length, B.length) + 2;

  const top = padLeft(A, w);
  const mid = "x" + padLeft(B, w - 1);
  const line = "-".repeat(w);

  const result = a * b;

  const blank = padLeft("__", w);
  const final = padLeft(String(result), w);

  return [
    top,
    mid,
    line,
    blank,
    "",
    `First: ${b} times ${a} is ${result}`,
    `Write: ${result}`,
    "",
    top,
    mid,
    line,
    final,
  ];
}

// Format division (whole numbers only)
function makeDivBoard(a: number, b: number) {
  const result = a / b;
  return [
    `${a} ÷ ${b}`,
    "----",
    "__",
    "",
    `First: share ${a} into ${b} groups`,
    `Then: each group gets ${result}`,
    `Write: ${result}`,
    "",
    `${a} ÷ ${b} = ${result}`,
  ];
}

export function tryMathFallback(userText: string): string | null {
  const input = normalize(userText);

  // Match simple expressions like: 12+12, 45 x 3, 24/6
  const m = input.match(/^(-?\d+)\s*([+\-x*/])\s*(-?\d+)$/i);
  if (!m) return null;

  const a = Number(m[1]);
  const op = m[2] as Op;
  const b = Number(m[3]);

  if (!isInt(a) || !isInt(b)) return null;

  // Encourage line + board block (THIS is what your UI needs)
  if (op === "+") {
    const lines = makeAddSubBoard(a, b, "+");
    return `You’ve got this! Let me solve :\n\n${boardBlock(lines)}`;
  }

  if (op === "-") {
    const lines = makeAddSubBoard(a, b, "-");
    return `You’ve got this! Let me solve :\n\n${boardBlock(lines)}`;
  }

  if (op === "x" || op === "*") {
    const lines = makeMulBoard(a, b);
    return `You’ve got this! Let me solve :\n\n${boardBlock(lines)}`;
  }

  if (op === "/") {
    if (b === 0) return null;
    if (a % b !== 0) return null; // keep it simple for kids
    const lines = makeDivBoard(a, b);
    return `You’ve got this! Let me solve :\n\n${boardBlock(lines)}`;
  }

  return null;
}