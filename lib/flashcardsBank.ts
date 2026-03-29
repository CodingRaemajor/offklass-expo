// lib/flashcardsBank.ts

export interface FlashcardBankCard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

export const FLASHCARDS_BANK: Record<string, FlashcardBankCard[]> = {
  "Unit 1: Place Value": [
    {
      id: "u1-1",
      front: "What number is made by 4 hundreds, 2 tens, and 7 ones?",
      back: "427",
      topic: "Place Value Basics",
    },
    {
      id: "u1-2",
      front: "What is the value of the digit 6 in 6,314?",
      back: "6,000",
      topic: "Place Value Basics",
    },
    {
      id: "u1-3",
      front: "What is the expanded form of 5,208?",
      back: "5,000 + 200 + 8",
      topic: "Expanded Form",
    },
    {
      id: "u1-4",
      front: "Which place is the 9 in for 2,945?",
      back: "Hundreds place",
      topic: "Finding Place Value",
    },
    {
      id: "u1-5",
      front: "Make the largest number with digits 3, 8, 1, 6.",
      back: "8,631",
      topic: "Creating the Largest Number",
    },
    {
      id: "u1-6",
      front: "Make the smallest number with digits 7, 0, 2, 5.",
      back: "2,057",
      topic: "Creating the Smallest Number",
    },
    {
      id: "u1-7",
      front: "What does the 0 mean in 4,052?",
      back: "There are no hundreds.",
      topic: "Place Value Basics",
    },
    {
      id: "u1-8",
      front: "Write 3,000 + 500 + 40 + 1 in standard form.",
      back: "3,541",
      topic: "Expanded Form",
    },
    {
      id: "u1-9",
      front: "In 8,173, which digit is in the tens place?",
      back: "7",
      topic: "Finding Place Value",
    },
    {
      id: "u1-10",
      front: "What number has 9 thousands, 1 hundred, 0 tens, and 4 ones?",
      back: "9,104",
      topic: "Place Value Basics",
    },
  ],

  "Unit 2: Addition & Subtraction": [
    {
      id: "u2-1",
      front: "What is 236 + 154?",
      back: "390",
      topic: "Addition Basics",
    },
    {
      id: "u2-2",
      front: "What is 701 - 289?",
      back: "412",
      topic: "Subtraction Basics",
    },
    {
      id: "u2-3",
      front: "What is 468 + 127?",
      back: "595",
      topic: "Addition Basics",
    },
    {
      id: "u2-4",
      front: "What is 900 - 365?",
      back: "535",
      topic: "Subtraction Basics",
    },
    {
      id: "u2-5",
      front: "A student has 145 marbles and gets 38 more. How many now?",
      back: "183",
      topic: "Word Problems",
    },
    {
      id: "u2-6",
      front: "A box has 500 crayons. 127 are used. How many remain?",
      back: "373",
      topic: "Word Problems",
    },
    {
      id: "u2-7",
      front: "What is 358 + 246?",
      back: "604",
      topic: "Regrouping and Place Value",
    },
    {
      id: "u2-8",
      front: "What is 620 - 184?",
      back: "436",
      topic: "Regrouping and Place Value",
    },
    {
      id: "u2-9",
      front: "Which sign do you use when finding how many are left?",
      back: "Subtraction",
      topic: "Math Operations",
    },
    {
      id: "u2-10",
      front: "Which sign do you use when finding a total together?",
      back: "Addition",
      topic: "Math Operations",
    },
  ],

  "Unit 3: Multiplication": [
    {
      id: "u3-1",
      front: "What is 6 × 7?",
      back: "42",
      topic: "Multiplication Concepts",
    },
    {
      id: "u3-2",
      front: "What is 9 × 4?",
      back: "36",
      topic: "Multiplication Concepts",
    },
    {
      id: "u3-3",
      front: "What is 13 × 3?",
      back: "39",
      topic: "Multiplication Concepts",
    },
    {
      id: "u3-4",
      front: "What is 22 × 2?",
      back: "44",
      topic: "Area Models and Partial Products",
    },
    {
      id: "u3-5",
      front: "What is 11 × 5?",
      back: "55",
      topic: "Multiplication Concepts",
    },
    {
      id: "u3-6",
      front: "Break 14 × 3 into partial products.",
      back: "10 × 3 + 4 × 3 = 42",
      topic: "Area Models and Partial Products",
    },
    {
      id: "u3-7",
      front: "A class has 4 rows of 8 desks. How many desks?",
      back: "32",
      topic: "Word Problems",
    },
    {
      id: "u3-8",
      front: "What is 25 × 4?",
      back: "100",
      topic: "Area Models and Partial Products",
    },
    {
      id: "u3-9",
      front: "What is 16 × 3?",
      back: "48",
      topic: "Multiplication Concepts",
    },
    {
      id: "u3-10",
      front: "What operation means equal groups added again and again?",
      back: "Multiplication",
      topic: "Multiplication Concepts",
    },
  ],

  "Unit 4: Division": [
    {
      id: "u4-1",
      front: "What is 24 ÷ 6?",
      back: "4",
      topic: "Division Basics",
    },
    {
      id: "u4-2",
      front: "What is 15 ÷ 3?",
      back: "5",
      topic: "Division Basics",
    },
    {
      id: "u4-3",
      front: "What is 19 ÷ 4?",
      back: "4 remainder 3",
      topic: "Remainders",
    },
    {
      id: "u4-4",
      front: "What is 22 ÷ 5?",
      back: "4 remainder 2",
      topic: "Remainders",
    },
    {
      id: "u4-5",
      front: "A teacher shares 18 pencils with 3 students equally. How many each?",
      back: "6",
      topic: "Word Problems",
    },
    {
      id: "u4-6",
      front: "A baker puts 28 cookies into 4 boxes equally. How many in each box?",
      back: "7",
      topic: "Word Problems",
    },
    {
      id: "u4-7",
      front: "What multiplication fact helps solve 32 ÷ 8?",
      back: "8 × 4 = 32",
      topic: "Division Basics",
    },
    {
      id: "u4-8",
      front: "What is 36 ÷ 9?",
      back: "4",
      topic: "Division Basics",
    },
    {
      id: "u4-9",
      front: "What is 17 ÷ 5?",
      back: "3 remainder 2",
      topic: "Remainders",
    },
    {
      id: "u4-10",
      front: "What operation means sharing equally into groups?",
      back: "Division",
      topic: "Division Basics",
    },
  ],
};

export function getFlashcardsBankByUnit(unit: string): FlashcardBankCard[] {
  return FLASHCARDS_BANK[unit] ?? [];
}

export function getAllFlashcardUnits(): string[] {
  return Object.keys(FLASHCARDS_BANK);
}