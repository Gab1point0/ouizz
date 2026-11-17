import { describe, expect, it } from 'vitest';
import { htmlToText, isKahoot, kahootToQuiz } from './kahoot';
import { grade } from './scoring';

const sample = {
  title: 'Test <b>gras</b>', quizType: 'quiz',
  questions: [
    { type: 'content', title: '<b>Salut</b>', description: 'Texte&nbsp;ici', questionFormat: 0, video: { id: 'abc', startTime: 5, endTime: 15 } },
    { type: 'quiz', question: 'Q ?', time: 20000, pointsMultiplier: 2, choices: [{ answer: 'A', correct: false }, { answer: 'B', correct: true }] },
    { type: 'quiz', question: 'VF', time: 10000, layout: 'TRUE_FALSE', choices: [{ answer: 'True', correct: false }, { answer: 'False', correct: true }] },
    { type: 'multiple_select_quiz', question: 'M', time: 20000, choices: [{ answer: 'x', correct: true }, { answer: 'y', correct: true }, { answer: 'z', correct: false }] },
    { type: 'open_ended', question: 'O', time: 20000, choices: [{ answer: 'Noé', correct: true }] },
    { type: 'slider', question: 'S', time: 20000, choiceRange: { start: 0, end: 100, step: 1, correct: 40, tolerance: 1 } },
    { type: 'pin_it', question: 'P', time: 30000, image: 'https://x/y', imageMetadata: { width: 200, height: 100 },
      choiceShapes: [{ type: 'polygon', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }] }, { type: 'ellipse', x: 150, y: 50, radiusX: 20, radiusY: 20 }] },
    { type: 'quiz', question: 'Voix', time: 20000, media: [{ type: 'read_aloud', text: 'Bonjour', languageInfo: { language: 'ja-JP' } }], choices: [{ answer: 'a', correct: true }] },
    { type: 'jumble', question: 'J', time: 30000, choices: [{ answer: '1' }, { answer: '2' }] },
    { type: 'survey', question: 'Sv', time: 20000, choices: [{ answer: 'a' }, { answer: 'b' }] },
    { type: 'word_cloud', question: 'W', time: 30000 },
    { type: 'feedback', question: 'F', time: 90000 },
  ],
};

describe('import Kahoot', () => {
  it('reconnaît et convertit tous les types', () => {
    expect(isKahoot(sample)).toBe(true);
    expect(isKahoot({ app: 'ouizz', quizzes: [] })).toBe(false);
    const { quiz, skipped } = kahootToQuiz(sample);
    expect(skipped).toEqual([]);
    expect(quiz.title).toBe('Test **gras**');
    expect(quiz.questions.map((q) => q.type)).toEqual(['slide', 'choice', 'truefalse', 'choice', 'type', 'slider', 'pin', 'choice', 'order', 'poll', 'wordcloud', 'open']);
    const [slide, choice, tf, multi, open, slider, pin, voice] = quiz.questions;
    expect(slide.body).toBe('Texte ici');
    expect(slide.media).toMatchObject({ kind: 'video', start: 5, end: 15 });
    expect(choice.points).toBe(2);
    expect(tf.correctBool).toBe(false);
    expect(multi.multi).toBe(true);
    expect(open.accepted).toEqual(['Noé']);
    expect(slider.slider).toMatchObject({ correct: 40, margin: 1 });
    expect(grade(pin, { x: 0.1, y: 0.2 })).toBe(1); // dans le triangle
    expect(grade(pin, { x: 0.75, y: 0.5 })).toBe(1); // dans le cercle
    expect(grade(pin, { x: 0.45, y: 0.9 })).toBe(0);
    expect(voice.speech).toEqual({ text: 'Bonjour', lang: 'ja-JP' });
  });
  it('HTML -> gras', () => {
    expect(htmlToText('Le<b>S</b>quel<b>S</b> &amp; co')).toBe('Le**S**quel**S** & co');
  });
});
