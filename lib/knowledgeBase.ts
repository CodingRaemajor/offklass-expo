// lib/knowledgeBase.ts

export type KnowledgeItem = {
  id: string;
  unit: string;
  topic: string;
  lessonIds?: string[];
  keywords: string[];
  questions: string[];
  answer: string;
  explanation?: string;
  example?: string;
  hint?: string;
  relatedQuizIds?: number[];
  relatedFlashcardIds?: number[];
};

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  /* ============================== UNIT 1 ============================== */
  {
    id: "u1-k1",
    unit: "Unit 1: Place Value",
    topic: "Place Value Basics",
    lessonIds: ["m1"],
    keywords: [
      "place value",
      "digit value",
      "value of a digit",
      "ones tens",
      "hundreds",
      "position of digit",
    ],
    questions: [
      "what is place value",
      "explain place value",
      "what does place value mean",
      "how does place value work",
      "what is the value of a digit based on position",
    ],
    answer:
      "Place value tells how much a digit is worth based on where it is in a number.",
    explanation:
      "The same digit can have different values depending on its position. A 5 in the ones place means 5, but a 5 in the tens place means 50.",
    example:
      "In 352, the 3 means 300, the 5 means 50, and the 2 means 2.",
    hint: "Look at the place: ones, tens, hundreds, then read the value.",
    relatedQuizIds: [1, 3, 4, 6, 10],
    relatedFlashcardIds: [1, 4, 7, 9],
  },
  {
    id: "u1-k2",
    unit: "Unit 1: Place Value",
    topic: "Ones and Tens",
    lessonIds: ["m1"],
    keywords: [
      "ones",
      "tens",
      "ones place",
      "tens place",
      "groups of ten",
      "single units",
    ],
    questions: [
      "what is ones place",
      "what is tens place",
      "explain ones and tens",
      "what do ones and tens mean",
      "how many tens are in a number",
    ],
    answer:
      "The ones place shows single units. The tens place shows groups of ten.",
    explanation:
      "As you move left in a number, each place becomes 10 times bigger.",
    example:
      "In 36, the 3 means 3 tens or 30, and the 6 means 6 ones.",
    hint: "Rightmost digit is ones. The digit just left of it is tens.",
    relatedQuizIds: [3, 8],
    relatedFlashcardIds: [2, 3, 8],
  },
  {
    id: "u1-k3",
    unit: "Unit 1: Place Value",
    topic: "Expanded Form",
    lessonIds: ["m1"],
    keywords: [
      "expanded form",
      "write in expanded form",
      "expanded notation",
      "break apart a number",
    ],
    questions: [
      "what is expanded form",
      "explain expanded form",
      "how do i write expanded form",
      "what is expanded notation",
    ],
    answer:
      "Expanded form shows a number as the sum of the value of each digit.",
    explanation:
      "You split the number into hundreds, tens, and ones so it is easier to see each digit’s value.",
    example:
      "482 = 400 + 80 + 2.",
    hint: "Write each digit using its place value, then add them.",
    relatedQuizIds: [2, 5, 9],
    relatedFlashcardIds: [5, 10],
  },
  {
    id: "u1-k4",
    unit: "Unit 1: Place Value",
    topic: "Standard Form",
    lessonIds: ["m1"],
    keywords: [
      "standard form",
      "write in standard form",
      "normal number form",
    ],
    questions: [
      "what is standard form",
      "how do i write standard form",
      "explain standard form",
    ],
    answer: "Standard form is the regular way we write a number.",
    explanation:
      "If expanded form breaks a number apart, standard form puts it back together.",
    example:
      "500 + 30 + 4 = 534.",
    hint: "Combine hundreds, tens, and ones into one number.",
    relatedQuizIds: [9],
    relatedFlashcardIds: [6],
  },

  /* ============================== UNIT 2 ============================== */
  {
    id: "u2-k1",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Addition",
    lessonIds: ["m2"],
    keywords: [
      "addition",
      "add",
      "sum",
      "adding numbers",
      "total",
      "plus",
    ],
    questions: [
      "what is addition",
      "explain addition",
      "how do i add numbers",
      "what does add mean",
      "what is sum",
    ],
    answer:
      "Addition means putting numbers together to find the total.",
    explanation:
      "You combine two or more amounts. Start from the ones place, then move left.",
    example:
      "27 + 15 = 42.",
    hint: "Line up digits by place value before adding.",
    relatedQuizIds: [1, 3, 5, 7, 10],
    relatedFlashcardIds: [1, 3, 6],
  },
  {
    id: "u2-k2",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Subtraction",
    lessonIds: ["m2"],
    keywords: [
      "subtraction",
      "subtract",
      "difference",
      "take away",
      "minus",
    ],
    questions: [
      "what is subtraction",
      "explain subtraction",
      "how do i subtract numbers",
      "what does subtract mean",
      "what is difference",
    ],
    answer:
      "Subtraction means taking one amount away from another to find the difference.",
    explanation:
      "Start from the ones place. If the top digit is smaller, you may need to regroup.",
    example:
      "52 - 19 = 33.",
    hint: "Subtract from right to left and regroup when needed.",
    relatedQuizIds: [2, 4, 8, 9],
    relatedFlashcardIds: [2, 4, 7],
  },
  {
    id: "u2-k3",
    unit: "Unit 2: Addition & Subtraction",
    topic: "Regrouping and Place Value",
    lessonIds: ["m2"],
    keywords: [
      "regrouping",
      "borrowing",
      "carrying",
      "rename",
      "trade a ten",
      "place value regrouping",
    ],
    questions: [
      "what is regrouping",
      "how does regrouping work",
      "why do we regroup",
      "what is borrowing in subtraction",
      "what is carrying in addition",
    ],
    answer:
      "Regrouping means moving value from one place to another when a place does not have enough.",
    explanation:
      "In subtraction, you may trade 1 ten for 10 ones. In addition, 10 ones become 1 ten.",
    example:
      "For 42 - 18, regroup 42 into 3 tens and 12 ones, then subtract.",
    hint: "Think of 1 ten as 10 ones.",
    relatedQuizIds: [2, 6, 8],
    relatedFlashcardIds: [5, 8, 9],
  },

  /* ============================== UNIT 3 ============================== */
  {
    id: "u3-k1",
    unit: "Unit 3: Multiplication",
    topic: "Multiplication Concepts",
    lessonIds: ["m3"],
    keywords: [
      "multiplication",
      "multiply",
      "times",
      "equal groups",
      "repeated addition",
    ],
    questions: [
      "what is multiplication",
      "explain multiplication",
      "how does multiplication work",
      "what does multiply mean",
      "what is repeated addition",
    ],
    answer:
      "Multiplication is repeated addition. It tells how many items are in equal groups.",
    explanation:
      "Instead of adding the same number again and again, multiplication gives a shorter way to show it.",
    example:
      "3 × 4 means 3 groups of 4, so 4 + 4 + 4 = 12.",
    hint: "Read multiplication as groups of.",
    relatedQuizIds: [1, 2, 5, 6, 9],
    relatedFlashcardIds: [1, 2, 7, 8],
  },
  {
    id: "u3-k2",
    unit: "Unit 3: Multiplication",
    topic: "Area Models and Partial Products",
    lessonIds: ["m4"],
    keywords: [
      "area model",
      "box method",
      "partial products",
      "two digit multiplication",
      "split numbers",
    ],
    questions: [
      "what is an area model",
      "explain area model multiplication",
      "what are partial products",
      "how do partial products work",
      "how do i multiply two digit numbers",
    ],
    answer:
      "Area models and partial products help you multiply by splitting numbers into smaller easier parts.",
    explanation:
      "You break a number into tens and ones, multiply each part, then add the results.",
    example:
      "13 × 4 = (10 × 4) + (3 × 4) = 40 + 12 = 52.",
    hint: "Split first, multiply each part, then add.",
    relatedQuizIds: [4, 7, 8, 10],
    relatedFlashcardIds: [4, 5, 6, 10],
  },

  /* ============================== UNIT 4 ============================== */
  {
    id: "u4-k1",
    unit: "Unit 4: Division",
    topic: "Division",
    lessonIds: ["m5"],
    keywords: [
      "division",
      "divide",
      "equal groups",
      "sharing equally",
      "split equally",
    ],
    questions: [
      "what is division",
      "explain division",
      "how does division work",
      "what does divide mean",
    ],
    answer:
      "Division means splitting a total into equal groups.",
    explanation:
      "You can think of division as sharing equally or finding how many groups can be made.",
    example:
      "12 ÷ 3 = 4 means 12 split into 3 equal groups gives 4 in each group.",
    hint: "Ask: how many in each group, or how many groups?",
    relatedQuizIds: [1, 5, 7, 8, 10],
    relatedFlashcardIds: [1, 4, 6, 8],
  },
  {
    id: "u4-k2",
    unit: "Unit 4: Division",
    topic: "Quotients, Remainders, and Word Problems",
    lessonIds: ["m5"],
    keywords: [
      "quotient",
      "remainder",
      "left over",
      "division word problems",
      "sharing problems",
    ],
    questions: [
      "what is a quotient",
      "what is a remainder",
      "explain quotient and remainder",
      "how do i solve division word problems",
      "explain division word problems",
    ],
    answer:
      "The quotient is the answer to a division problem. The remainder is what is left over if it cannot be shared equally.",
    explanation:
      "In word problems, first find the total and the number of groups, then divide.",
    example:
      "14 ÷ 4 = 3 remainder 2. Also, 20 cookies shared by 5 children gives 4 each.",
    hint: "Multiply the quotient by the divisor and add the remainder to check.",
    relatedQuizIds: [2, 3, 4, 6, 8, 9],
    relatedFlashcardIds: [2, 3, 5, 7, 9, 10],
  },
];