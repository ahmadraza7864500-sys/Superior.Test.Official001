export interface ParsedQuestion {
  number: number;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
}

export interface ParseError {
  questionNumber: number;
  message: string;
  expected: string;
}

export function parseMCQText(text: string): { questions: ParsedQuestion[]; errors: ParseError[] } {
  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];

  let normalized = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\*\*/g, '').replace(/---+/g, '\n').replace(/___+/g, '\n')
    .replace(/\t/g, '  ');

  const questionBlocks = normalized.split(/(?=(?:^|\n)\s*\d+[\.\)\:]\s)/);

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^(\d+)\s*[\.\)\:]\s*/);
    if (!numMatch) continue;

    const currentNum = parseInt(numMatch[1]);
    let content = trimmed.replace(/^\d+\s*[\.\)\:]\s*/, '');

    const optionPattern = /(?:^|\n)\s*[A-Da-d]\s*[\.\)\:]\s*/g;
    const optionMatches = [...content.matchAll(optionPattern)];

    if (optionMatches.length < 4) {
      errors.push({ questionNumber: currentNum, message: `Question ${currentNum}: fewer than 4 options (${optionMatches.length} found).`, expected: 'Each question needs 4 options: A), B), C), D)' });
      continue;
    }

    const firstOptionIndex = content.search(/(?:^|\n)\s*[A-Da-d]\s*[\.\)\:]\s*/);
    const questionText = content.substring(0, firstOptionIndex).trim();

    if (!questionText) {
      errors.push({ questionNumber: currentNum, message: `Question ${currentNum}: no question text.`, expected: 'Add question text before the options.' });
      continue;
    }

    const options: { [key: string]: string } = {};
    const letters = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < 4; i++) {
      const startIdx = optionMatches[i].index! + optionMatches[i][0].length;
      const endIdx = i < 3 ? optionMatches[i + 1].index! : content.length;
      let optionText = content.substring(startIdx, endIdx).trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      options[letters[i]] = optionText;
    }

    let correctAnswer = '';
    const answerPatterns = [/correct\s*answer\s*[\:\:]?\s*([A-Da-d])/i, /answer\s*[\:\:]?\s*([A-Da-d])/i, /ans\s*[\:\:]?\s*([A-Da-d])/i];
    for (const pattern of answerPatterns) {
      const match = content.match(pattern);
      if (match) { correctAnswer = match[1].toUpperCase(); break; }
    }

    if (!correctAnswer) {
      errors.push({ questionNumber: currentNum, message: `Question ${currentNum}: no correct answer.`, expected: 'Add "Correct Answer: A" (or B, C, D).' });
      continue;
    }

    questions.push({ number: currentNum, text: questionText, options: { A: options.A, B: options.B, C: options.C, D: options.D }, correctAnswer });
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push({ questionNumber: 0, message: 'No questions parsed.', expected: 'Format: 1. Question\\nA) Option\\nB) Option\\nC) Option\\nD) Option\\nCorrect Answer: A' });
  }

  return { questions, errors };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString + (dateString.includes('T') ? '' : 'Z')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString + (dateString.includes('T') ? '' : 'Z')).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}
