import { en } from "./en";
import { pt } from "./pt-br";
import type { Locale } from "./locale";

/**
 * Turns the `as const` literal types of the Portuguese dictionary into plain types (string,
 * number, boolean), keeping its shape: the English dictionary must have exactly the same keys,
 * functions and arrays, but naturally different text.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

export type Dictionary = Widen<typeof pt>;

export const dictionaries: Record<Locale, Dictionary> = { pt, en };
