/**
 * Module-level flag that is set synchronously the moment the quiz completes,
 * before any async storage writes or router calls. This lets the RootNavigator
 * guard bail out immediately without racing against AsyncStorage reads.
 *
 * Also backed by AsyncStorage so it survives hot-reload within the same session.
 */
let quizJustCompleted = false;

export function markQuizComplete() {
  quizJustCompleted = true;
  // Also write to AsyncStorage as a backup for hot-reload scenarios
  import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
    AsyncStorage.setItem('quizJustCompleted_session', 'true').catch(() => {});
  });
  console.log('[quizState] markQuizComplete() called — navigation guard disabled');
}

export function isQuizJustCompleted() {
  return quizJustCompleted;
}

// Call this on app startup to clear the session flag from any previous session
export async function clearQuizJustCompleted() {
  quizJustCompleted = false;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem('quizJustCompleted_session');
  } catch (e) {}
}
