import { useCallback } from 'react';

/**
 * Haptic feedback utility using the HTML5 Vibration API (navigator.vibrate).
 * Safely degrades on iOS Safari or desktop browsers where navigator.vibrate is unsupported.
 */

export type HapticType = 'buzz' | 'submit' | 'wrong' | 'correct' | 'tap' | 'shatter';

export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  // Heavy multi-pulse buzzer sensation (60ms vibration, 40ms pause, 100ms authoritative thud)
  buzz: [60, 40, 100],
  // Crisp mechanical click for answer submission
  submit: 45,
  // Harsh, descending error rumble for wrong answers
  wrong: [80, 50, 80, 50, 130],
  // Celebratory upbeat double-pulse for correct answers
  correct: [45, 45, 90],
  // Subtle tactile tap for keypad and buttons
  tap: 18,
  // Rapid shattering pulse for ice sabotage
  shatter: [30, 20, 40]
};

/**
 * Triggers a device vibration pattern if supported by hardware and browser permissions.
 */
export function triggerHaptic(typeOrPattern: HapticType | number | number[] = 'tap'): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!('vibrate' in navigator)) return false;

  try {
    const pattern = typeof typeOrPattern === 'string'
      ? (HAPTIC_PATTERNS[typeOrPattern] ?? 30)
      : typeOrPattern;

    return navigator.vibrate(pattern);
  } catch (err) {
    // Graceful fallback for non-vibrating devices or user restrictions
    return false;
  }
}

/**
 * React hook providing convenient, pre-configured haptic feedback triggers.
 */
export function useHaptics() {
  const buzz = useCallback(() => triggerHaptic('buzz'), []);
  const submit = useCallback(() => triggerHaptic('submit'), []);
  const wrong = useCallback(() => triggerHaptic('wrong'), []);
  const correct = useCallback(() => triggerHaptic('correct'), []);
  const tap = useCallback(() => triggerHaptic('tap'), []);
  const shatter = useCallback(() => triggerHaptic('shatter'), []);

  return {
    buzz,
    submit,
    wrong,
    correct,
    tap,
    shatter,
    trigger: triggerHaptic
  };
}
