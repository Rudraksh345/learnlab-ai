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
  difficulty?: "easy" | "medium" | "hard";
};

export type SimParam = {
  key: "a" | "b" | "c";
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type SimCurve = {
  label: string;
  /** JS math expression in terms of x, a, b, c */
  expression: string;
};

export type SimVector = {
  label: string;
  /** expression in a, b, c */
  x: string;
  /** expression in a, b, c */
  y: string;
};

export type SimParametric = {
  label: string;
  /** expression in x (used as parameter t) and a, b, c */
  xExpr: string;
  yExpr: string;
};

export type Simulation = {
  available: boolean;
  /** what kind of interactive lab to render */
  mode?: "graph" | "vector" | "parametric";
  /** vector mode: draggable arrows */
  vectors?: SimVector[];
  /** parametric mode: (x(t), y(t)) curves */
  parametric?: SimParametric[];
  /** graph mode: show a live tangent line at the dragged point */
  tangent?: boolean;
  /** graph mode: shade + measure the area from 0 to the dragged point */
  area?: boolean;
  title: string;
  description: string;
  /** JS math expression in terms of x, a, b, c. e.g. "a*x*x + b*x + c" */
  expression: string;
  /** Optional extra curves plotted together (e.g. function + derivative) */
  curves?: SimCurve[];
  xMin: number;
  xMax: number;
  xLabel?: string;
  yLabel?: string;
  params: SimParam[];
  /** Parameter animated over time when the user presses play */
  animateParam?: "a" | "b" | "c" | null;
  insight: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type QuestionSolution = {
  question: string;
  topic: string;
  meaning: string[];
  approach: string;
  steps: { title: string; detail: string }[];
  answer: string;
  simulation?: Simulation;
  simulations?: Simulation[];
  hinglish: string[];
  tips: string[];
};

export type FormulaSheet = {
  title: string;
  sections: {
    heading: string;
    items: { name: string; formula: string; condition?: string }[];
  }[];
  reminders?: string[];
};

export type NoteBlock = {
  kind: "point" | "formula" | "box" | "callout" | "example" | "arrow";
  text: string;
  label?: string;
};

export type RichNotes = {
  title: string;
  language: "english" | "hinglish";
  sections: {
    heading: string;
    color: "blue" | "purple" | "green" | "pink" | "amber";
    blocks: NoteBlock[];
  }[];
};

export type StudyPack = {
  topic: string;
  summary: string;
  notes?: string[];
  concepts: { term: string; definition: string }[];
  formulas: Formula[];
  examples: Example[];
  simulation?: Simulation;
  simulations?: Simulation[];
  quiz: QuizQuestion[];
  examPoints: string[];
};
