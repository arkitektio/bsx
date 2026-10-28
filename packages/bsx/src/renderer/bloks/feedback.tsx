import {
  Alert as ShadAlert,
  AlertDescription as ShadAlertDescription,
  AlertTitle as ShadAlertTitle,
} from '../../vendor/core/ui/alert';
import {Badge as ShadBadge} from '../../vendor/core/ui/badge';
import {
  Empty as ShadEmpty,
  EmptyContent as ShadEmptyContent,
  EmptyDescription as ShadEmptyDescription,
  EmptyHeader as ShadEmptyHeader,
  EmptyMedia as ShadEmptyMedia,
  EmptyTitle as ShadEmptyTitle,
} from '../../vendor/core/ui/empty';
import {Progress as ShadProgress} from '../../vendor/core/ui/progress';
import {Skeleton as ShadSkeleton} from '../../vendor/core/ui/skeleton';
import {Spinner as ShadSpinner} from '../../vendor/core/ui/spinner';
import type {feedbackContracts} from '../../catalogs/parts/feedback';
import {useBlok, useBlokDataAttributes, useValue, type BlokRender} from '../runtime';
import {renderIcon} from './icons';
import {renderChildList, renderContent} from './shared';

type Contracts = typeof feedbackContracts;

/** Status, progress and empty-state bloks. */

const AlertRender: BlokRender<Contracts['Alert']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const className = useValue(blok.className);

    const attributes = useBlokDataAttributes();

    return (
      <ShadAlert {...attributes} variant={variant ?? 'default'} className={className}>
        {renderIcon(icon)}
        {title ? <ShadAlertTitle>{title}</ShadAlertTitle> : null}
        {description ? <ShadAlertDescription>{description}</ShadAlertDescription> : null}
        {renderChildList(children, buildChild)}
      </ShadAlert>
    );
};

const BadgeRender: BlokRender<Contracts['Badge']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const variant = useValue(blok.variant);

    const attributes = useBlokDataAttributes();

    return (
      <ShadBadge {...attributes} variant={variant ?? 'default'} className={className}>
        {renderIcon(icon, 'size-3')}
        {renderContent(children ?? text, buildChild)}
      </ShadBadge>
    );
};

const ProgressRender: BlokRender<Contracts['Progress']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const max = useValue(blok.max);
    const className = useValue(blok.className);

    const resolvedMax = max ?? 100;
    const percent = resolvedMax > 0 ? ((value ?? 0) / resolvedMax) * 100 : 0;

    const attributes = useBlokDataAttributes();

    return <ShadProgress {...attributes} value={Math.max(0, Math.min(100, percent))} className={className} />;
};

const SkeletonRender: BlokRender<Contracts['Skeleton']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const width = useValue(blok.width);
    const height = useValue(blok.height);
    const className = useValue(blok.className);

    return <ShadSkeleton className={className} style={{width, height}} />;
};

const SpinnerRender: BlokRender<Contracts['Spinner']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadSpinner className={className} />;
};

const EmptyRender: BlokRender<Contracts['Empty']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadEmpty className={className}>
        <ShadEmptyHeader>
          {icon ? <ShadEmptyMedia variant="icon">{renderIcon(icon, 'size-6')}</ShadEmptyMedia> : null}
          {title ? <ShadEmptyTitle>{title}</ShadEmptyTitle> : null}
          {description ? <ShadEmptyDescription>{description}</ShadEmptyDescription> : null}
        </ShadEmptyHeader>
        {children ? (
          <ShadEmptyContent>{renderChildList(children, buildChild)}</ShadEmptyContent>
        ) : null}
      </ShadEmpty>
    );
};

export const feedbackRenders = {
  Alert: AlertRender,
  Badge: BadgeRender,
  Progress: ProgressRender,
  Skeleton: SkeletonRender,
  Spinner: SpinnerRender,
  Empty: EmptyRender,
};
