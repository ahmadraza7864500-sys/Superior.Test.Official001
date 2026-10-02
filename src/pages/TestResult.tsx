import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context';
import * as api from '../api';
import { ThemeToggle, Logo, Card } from '../components';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Award } from 'lucide-react';

export default function TestResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);

  useEffect(() => { loadResult(); }, []);

  const loadResult = async () => {
    if (!user || !attemptId) { navigate('/student'); return; }
    const att = await api.getAttempt(parseInt(attemptId));
    if (!att || att.student_id !== user.id) { navigate('/student'); return; }
    const t = await api.getTest(att.test_id);
    if (!t) { navigate('/student'); return; }
    if (!t.show_result_immediately && att.status !== 'submitted') { navigate('/student'); return; }
    setTest(t); setAttempt(att);
    setQuestions(await api.getQuestions(t.id));
    setAnswers(await api.getStudentAnswers(att.id));
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-theme-secondary"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!test || !attempt) return <div className="min-h-screen flex items-center justify-center bg-theme-secondary"><p className="text-theme-secondary">Result not found.</p></div>;

  const getAnswer = (qId: number) => answers.find((a: any) => a.question_id === qId);

  return (
    <div className="min-h-screen bg-theme-secondary">
      <div className="bg-theme-card border-b border-theme">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/student" className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary text-sm"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
          <div className="flex items-center gap-2"><ThemeToggle /></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-6 sm:p-8 mb-6">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${attempt.percentage >= 60 ? 'bg-green-100 dark:bg-green-900/30' : attempt.percentage >= 40 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <Award className={`w-10 h-10 ${attempt.percentage >= 60 ? 'text-green-600' : attempt.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <h1 className="text-2xl font-bold text-theme-primary">{test.title}</h1>
            <p className="text-theme-muted mt-1">Attempt #{attempt.attempt_number} · {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString()}</p>
          </div>
          <div className="text-center mb-8">
            <div className={`text-5xl font-bold ${attempt.percentage >= 60 ? 'text-green-600' : attempt.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{attempt.percentage}%</div>
            <p className="text-theme-secondary mt-2">{attempt.obtained_marks} / {attempt.total_marks} marks</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl"><CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" /><div className="text-2xl font-bold text-green-700 dark:text-green-400">{attempt.correct_count}</div><div className="text-xs text-green-600">Correct</div></div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl"><XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" /><div className="text-2xl font-bold text-red-700 dark:text-red-400">{attempt.wrong_count}</div><div className="text-xs text-red-600">Wrong</div></div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"><MinusCircle className="w-6 h-6 text-gray-500 mx-auto mb-1" /><div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{attempt.unanswered_count}</div><div className="text-xs text-gray-600">Unanswered</div></div>
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"><Award className="w-6 h-6 text-indigo-600 mx-auto mb-1" /><div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{questions.length}</div><div className="text-xs text-indigo-600">Total</div></div>
          </div>
          {test.negative_marking > 0 && <p className="text-center text-sm text-theme-muted mt-4">Negative marking: -{test.negative_marking} per wrong answer</p>}
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-theme-primary mb-6">Detailed Review</h2>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const studentAnswer = getAnswer(q.id);
              const selected = studentAnswer?.selected_answer || '';
              const isCorrect = selected === q.correct_answer;
              const isUnanswered = !selected;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isUnanswered ? 'border-theme bg-theme-tertiary' : isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isUnanswered ? 'bg-gray-200 dark:bg-gray-700' : isCorrect ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'}`}>
                      {isUnanswered ? <MinusCircle className="w-3.5 h-3.5 text-gray-500" /> : isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-green-700 dark:text-green-300" /> : <XCircle className="w-3.5 h-3.5 text-red-700 dark:text-red-300" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-theme-primary text-sm">Q{index + 1}. {q.question_text}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[{ key: 'A', text: q.option_a }, { key: 'B', text: q.option_b }, { key: 'C', text: q.option_c }, { key: 'D', text: q.option_d }].map(opt => (
                          <div key={opt.key} className={`text-sm px-2 py-1 rounded ${opt.key === q.correct_answer ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium' : opt.key === selected && !isCorrect ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 line-through' : 'text-theme-secondary'}`}>
                            {opt.key}) {opt.text}{opt.key === q.correct_answer && ' ✓'}{opt.key === selected && !isCorrect && ' (yours)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-6 text-center"><Link to="/student" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link></div>
      </div>
    </div>
  );
}
