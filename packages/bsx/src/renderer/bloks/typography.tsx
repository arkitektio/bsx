import {Kbd as ShadKbd} from '../../vendor/core/ui/kbd';
import {Markdown as ShadMarkdown} from '../../vendor/core/ui/markdown';
import {cn} from '../../vendor/core/util/utils';
import * as React from 'react';
import type {typographyContracts} from '../../catalogs/parts/typography';
import {dateText, relativeTime} from '../functions/v2';
import {useBlok, useBlokDataAttributes, useBlokRuntime, useValue, type BlokRender} from '../runtime';
import {mapTextAlign, renderContent, textPresentationClasses, useTextPresentationProps} from './shared';

type Contracts = typeof typographyContracts;

/** Text-bearing bloks. See `layout.tsx` for the naming convention. */

/** `Text` and `p`/`span` differ only in the element they render: one render over one schema. */
const textRender =
  (element: 'p' | 'span'): BlokRender<Contracts['Text']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const presentation = useTextPresentationProps(blok);
      const attributes = useBlokDataAttributes();
      const Element = element;

      return (
        <Element {...attributes} className={cn(...textPresentationClasses(presentation), className)}>
          {renderContent(children ?? text, buildChild)}
        </Element>
      );
  };

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingClassName = (level: HeadingLevel, align?: 'start' | 'center' | 'end') =>
  cn(
    mapTextAlign(align),
    level === 'h1' && 'text-4xl font-extrabold tracking-tight',
    level === 'h2' && 'text-3xl font-bold tracking-tight',
    level === 'h3' && 'text-2xl font-semibold tracking-tight',
    level === 'h4' && 'text-xl font-semibold tracking-tight',
    level === 'h5' && 'text-lg font-semibold',
    level === 'h6' && 'text-base font-semibold uppercase tracking-wide text-muted-foreground',
  );

/** `Heading` takes the level as a prop. */
const HeadingRender: BlokRender<Contracts['Heading']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const level = useValue(blok.level);
    const align = useValue(blok.align);
    const className = useValue(blok.className);

    const resolvedLevel = (level ?? 'h3') as HeadingLevel;
    const Element = resolvedLevel;
    const attributes = useBlokDataAttributes();

    return (
      <Element {...attributes} className={cn(headingClassName(resolvedLevel, align), className)}>
        {renderContent(children ?? text, buildChild)}
      </Element>
    );
};


const KbdRender: BlokRender<Contracts['Kbd']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return <ShadKbd className={className}>{renderContent(children ?? text, buildChild)}</ShadKbd>;
};

const MarkdownRender: BlokRender<Contracts['Markdown']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const content = useValue(blok.content);
    const className = useValue(blok.className);

    return <ShadMarkdown text={content ?? ''} className={className} />;
};

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

/** How long until a relative text can change: every second under a minute, then every half minute. */
const tickFor = (distanceMs: number): number => (Math.abs(distanceMs) < 60_000 ? 1_000 : 30_000);

/**
 * The wall clock, ticking while `active`: the one place a blok's view reads
 * it (the language never does). Measured from `then` while travelling, it
 * does not tick at all.
 */
const useClock = (active: boolean, target: number | null): number => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        const current = Date.now();
        setNow(current);
        schedule(tickFor(target === null ? 0 : target - current));
      }, delay);
    };
    // Caught up at once (it may have been off while travelling), then on its own beat.
    schedule(0);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [active, target]);
  return now;
};

/**
 * `<Time value relative? format?>` (ui@1): a moment, absolute or relative.
 * Relative time is measured from the viewed moment: the wall clock live
 * (ticking here), `then` while travelling, so the past renders as it did.
 */
const TimeRender: BlokRender<Contracts['Time']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const relative = useValue(blok.relative) === true;
    const format = useValue(blok.format);
    const className = useValue(blok.className);
    const travelAt = useBlokRuntime(state => state.travelAt);
    const attributes = useBlokDataAttributes();
    const moment = typeof value === 'string' ? Date.parse(value) : Number.NaN;
    const known = !Number.isNaN(moment);
    const then = travelAt === null ? Number.NaN : Date.parse(travelAt);
    const live = Number.isNaN(then);
    const now = useClock(relative && known && live, known ? moment : null);
    if (!known || typeof value !== 'string') return null;
    const text = relative ? relativeTime((moment - (live ? now : then)) / 1000, undefined) : dateText(value, format ?? null, undefined, true);
    return (
      <time {...attributes} dateTime={value} title={relative ? dateText(value, null, undefined, true) : undefined} className={cn(className)}>
        {text}
      </time>
    );
};

export const typographyRenders = {
  Text: textRender('p'),
  p: textRender('p'),
  span: textRender('span'),
  Heading: HeadingRender,
  Kbd: KbdRender,
  Markdown: MarkdownRender,
  Time: TimeRender,
};
