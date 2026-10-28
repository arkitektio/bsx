import defaultTailwindTheme from './tailwind/defaultTheme';
import type * as React from 'react';
import {createKeyedStore, type KeyedStore, type KeyedStoreOptions} from './cache/keyedStore';
import type {BlokCatalog} from './renderer/runtime/functions';

/**
 * What a blok needs from the app that hosts it, and the app gives once at start
 * (`configureBlokPlatform`), before anything renders:
 *
 * - `toast`: the app's notifications (`ui.toast`, `<Toast>`). Without one, the console.
 * - `describeError`: an error as one sentence (a failed read's `error`).
 * - `useKeepLive`: a hook a GPU canvas calls so a hidden tab keeps it alive.
 * - `useColorScheme`: a hook telling the editor light or dark.
 * - `tailwindTheme`: the CSS that says what a Tailwind class means in the app
 *   (custom variants, tokens, utilities), which the runtime compiler that
 *   styles bloks reads, so a class in a blok means what it means around it.
 * - `dracoDecoderPath`: where the app serves three's DRACO decoder
 *   (`three/examples/jsm/libs/draco/gltf/`), relative to the page.
 * - `catalog`: the app's catalog, for every renderer no `BlokCatalogProvider`
 *   reaches (an offscreen root drawing a logo); the package's standard one by default.
 * - `copyText`: puts text on the clipboard (`ui.copy`, `clipboard.copy`); the browser's by default.
 * - `keyedStore`: where kept locals and component state live; IndexedDB by default.
 * - `primitives`: how the runtime itself draws a node's error, a pending node, a
 *   locked one and a `suspense` body held hidden: DOM elements by default, a
 *   native app's own views elsewhere.
 *
 * A function an effect calls (`ui.toast`) runs outside React, so this is a
 * module, not a context: one app, one platform.
 */
export type BlokToastOptions = {description?: string} & Record<string, unknown>;

export type BlokToast = ((message: string, options?: BlokToastOptions) => unknown) & {
  success: (message: string, options?: BlokToastOptions) => unknown;
  info: (message: string, options?: BlokToastOptions) => unknown;
  warning: (message: string, options?: BlokToastOptions) => unknown;
  error: (message: string, options?: BlokToastOptions) => unknown;
};

/** What a node's error is shown with (`BlokNodeErrorCard`'s props). */
export type BlokPrimitiveErrorProps = {componentId: string; title: string; detail?: string};

/** The runtime's own drawing, where the DOM is not the screen (React Native). */
export type BlokPrimitives = {
  ErrorCard: React.ComponentType<BlokPrimitiveErrorProps>;
  Skeleton: React.ComponentType<{componentId: string}>;
  /** Wraps a node a held lock keeps from acting; `reason` says why. */
  Locked: React.ComponentType<{reason: string; children?: React.ReactNode}>;
  /**
   * Keeps `children` mounted but out of sight while `hidden` (a `suspense`
   * body waiting on its reads), with no box of its own when shown.
   */
  Hidden: React.ComponentType<{hidden: boolean; children?: React.ReactNode}>;
};

export type BlokPlatform = {
  toast: BlokToast;
  describeError: (error: unknown) => {message: string};
  useKeepLive: () => void;
  useColorScheme: () => 'light' | 'dark';
  tailwindTheme: string;
  dracoDecoderPath: string;
  catalog: BlokCatalog | null;
  copyText: (text: string) => Promise<void>;
  keyedStore: <T>(options: KeyedStoreOptions<T>) => KeyedStore<T>;
  primitives: Partial<BlokPrimitives>;
};

const consoleToast = (level: 'log' | 'info' | 'warn' | 'error') => (message: string, options?: BlokToastOptions) =>
  console[level](options?.description ? `${message}: ${options.description}` : message);

const NO_REASON = 'Something went wrong.';

const defaultDescribeError = (error: unknown): {message: string} => {
  if (typeof error === 'string') return {message: error.trim() || NO_REASON};
  if (error instanceof Error) return {message: error.message || NO_REASON};
  return {message: NO_REASON};
};

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const defaults: BlokPlatform = {
  toast: Object.assign(consoleToast('log'), {
    success: consoleToast('info'),
    info: consoleToast('info'),
    warning: consoleToast('warn'),
    error: consoleToast('error'),
  }),
  describeError: defaultDescribeError,
  useKeepLive: () => {},
  useColorScheme: () => (prefersDark() ? 'dark' : 'light'),
  tailwindTheme: defaultTailwindTheme,
  dracoDecoderPath: './draco/gltf/',
  catalog: null,
  copyText: text => {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    return clipboard ? clipboard.writeText(text) : Promise.reject(new Error('No clipboard is available here.'));
  },
  keyedStore: createKeyedStore,
  primitives: {},
};

let platform: BlokPlatform = defaults;

/** Give the bloks what the app has; what is left out keeps its default. Call it before the first render. */
export const configureBlokPlatform = (given: Partial<BlokPlatform>): void => {
  platform = {...platform, ...given};
};

/** The platform as configured. */
export const blokPlatform = (): BlokPlatform => platform;

/** The app's notifications. */
export const toast: BlokToast = Object.assign((message: string, options?: BlokToastOptions) => platform.toast(message, options), {
  success: (message: string, options?: BlokToastOptions) => platform.toast.success(message, options),
  info: (message: string, options?: BlokToastOptions) => platform.toast.info(message, options),
  warning: (message: string, options?: BlokToastOptions) => platform.toast.warning(message, options),
  error: (message: string, options?: BlokToastOptions) => platform.toast.error(message, options),
});

export const describeError = (error: unknown): {message: string} => platform.describeError(error);

/** Keep the hidden tab around this canvas alive (the app's hook; nothing by default). */
export const useKeepTabLive = (): void => platform.useKeepLive();

/** Light or dark, as the app says (the OS by default). */
export const useTheme = (): {resolvedTheme: 'light' | 'dark'} => ({resolvedTheme: platform.useColorScheme()});
