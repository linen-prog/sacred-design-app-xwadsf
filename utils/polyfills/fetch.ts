import { fetch as expoFetch } from 'expo/fetch';

// Export expo/fetch for SSE usage without overriding global fetch.
// Overriding global fetch breaks Better Auth on Android ("Cannot convert to a known Kotlin type").
export { expoFetch };

// Dynamic imports so missing packages don't break the bundle
Promise.all([
  import('@stardazed/streams-text-encoding').catch(() => null),
  import('@ungap/structured-clone').catch(() => null),
]).then(([streamsModule, structuredCloneModule]) => {
  if (streamsModule) {
    // @ts-expect-error untyped internal module
    const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');
    polyfillGlobal('TextEncoderStream', () => streamsModule.TextEncoderStream);
    polyfillGlobal('TextDecoderStream', () => streamsModule.TextDecoderStream);
  }

  if (structuredCloneModule && !('structuredClone' in globalThis)) {
    // @ts-expect-error untyped internal module
    const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');
    polyfillGlobal('structuredClone', () => structuredCloneModule.default);
  }
});
