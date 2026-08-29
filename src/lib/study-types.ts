export type Formula = {
  name: string;
  latexLike: string;
  variables: { symbol: string; meaning: string }[];
  usage: string;
};

export type Example = {
  title: string;
  problem: string;
  steps: string[];
  answer: string;
};

export type SimParam = {
  key: "a" | "b" | "c";
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type Simulation = {
  available: boolean;
  title: string;
  description: string;
  /** JS math expression in terms of x, a, b, c. e.g. "a*x*x + b*x + c" */
  expression: string;
  xMin: number;
  xMax: number;
  params: SimParam[];
  insight: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type StudyPack = {
  topic: string;
  summary: string;
  notes: string[];
  concepts: { term: string; definition: string }[];
  formulas: Formula[];
  examples: Example[];
  simulation: Simulation;
  quiz: QuizQuestion[];
  examPoints: string[];
};
