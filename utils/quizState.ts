/**
 * Module-level flag that is set synchronously the moment the quiz completes,
 * before any async storage writes or router calls. This lets the RootNavigator
 * guard bail out immediately without racing against AsyncStorage reads.
 */
let quizJustCompleted = false;

export function markQuizComplete() {
  quizJustCompleted = true;
  console.log('[quizState] markQuizComplete() called — navigation guard disabled');
}

export function isQuizJustCompleted() {
  return quizJustCompleted;
}
