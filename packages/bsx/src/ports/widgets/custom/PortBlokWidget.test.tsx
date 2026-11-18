// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import * as React from 'react';
import {useForm, type FieldValues, type UseFormReturn} from 'react-hook-form';
import {afterEach, describe, expect, it} from 'vitest';

import BlokRenderer from '../../../renderer/BlokRenderer';
import {testCatalog} from '../../../renderer/bloks/testing';
import {Form} from '../../../vendor/core/ui/form';
import {createWidgetRegistry} from '../../engine/defaultRegistry';
import type {ArgPort} from '../../engine/types';
import {WidgetRegistryContext, type WidgetRegistryContextType} from '../../engine/WidgetsContext';
import {configurePortHost} from '../../host';
import {AssignWidgetKind, PortKind, type BlokAssignWidgetFragment} from '../../rekuest';
import {argsRead, PortBlokWidget, type PortBlokRendererProps} from './PortBlokWidget';
import {parseBsx} from '../../../bsx/parse';

afterEach(cleanup);

const SOURCE = `<Blok kind="port" context="panel">
  <Input bind={port.value} placeholder="exposure" />
  <p>{args.limit}</p>
  <Button onClick={port.set(args.limit)}>Longest</Button>
  <Button onClick={port.reset()}>Back</Button>
</Blok>`;

const port = {__typename: 'ArgPort', key: 'exposure', label: 'Exposure', kind: PortKind.Float, nullable: false, description: 'How long the shutter stays open'} as unknown as ArgPort;
const widget = (source: string): BlokAssignWidgetFragment => ({__typename: 'BlokAssignWidget', kind: AssignWidgetKind.Blok, source, vocab: 2, fallback: null});

/** The renderer an app provides: here with the test catalog, and no agents. */
const TestRenderer = ({tree, data, writePort, children}: PortBlokRendererProps) => (
  <BlokRenderer uiComponents={[tree]} initialState={data} catalog={testCatalog()} writePort={writePort} chrome="none" sizing="intrinsic">
    {children}
  </BlokRenderer>
);

const Harness = ({source, held}: {source: string; held: {form?: UseFormReturn}}) => {
  const form = useForm<FieldValues>({defaultValues: {exposure: 5, limit: 9, gain: 1}});
  held.form = form;
  const registry = React.useMemo(() => createWidgetRegistry() as unknown as WidgetRegistryContextType['registry'], []);
  return (
    <WidgetRegistryContext.Provider value={{registry, setRegistry: () => undefined}}>
      <Form {...form}>
        <PortBlokWidget port={port} widget={widget(source)} path={['exposure']} />
      </Form>
    </WidgetRegistryContext.Provider>
  );
};

describe('a port blok as a field of the form', () => {
  it('reads only the arguments its tree names', () => {
    expect(argsRead(parseBsx(SOURCE).tree)).toEqual(['limit']);
  });

  it('shows the port and the form, and writes the value of its port and nothing else', () => {
    configurePortHost({PortBlokRenderer: TestRenderer});
    const held: {form?: UseFormReturn} = {};
    render(<Harness source={SOURCE} held={held} />);

    // The form draws its own label and description around a blok that places none.
    expect(screen.getByText('Exposure')).toBeTruthy();
    expect(screen.getByText('How long the shutter stays open')).toBeTruthy();
    const input = screen.getByPlaceholderText('exposure') as HTMLInputElement;
    expect(input.value).toBe('5');
    expect(screen.getByText('9')).toBeTruthy();

    // A bound control writes the field, which the form then marks dirty.
    fireEvent.change(input, {target: {value: '7'}});
    expect(held.form?.getValues('exposure')).toBe('7');
    expect(held.form?.getFieldState('exposure').isDirty).toBe(true);
    expect(held.form?.getValues('limit')).toBe(9);

    // port.set writes it from a callback; port.reset puts back what the form opened with.
    fireEvent.click(screen.getByText('Longest'));
    expect(held.form?.getValues('exposure')).toBe(9);
    fireEvent.click(screen.getByText('Back'));
    expect(held.form?.getValues('exposure')).toBe(5);
  });

  it('falls back to the port’s own control where the source is no port blok', () => {
    configurePortHost({PortBlokRenderer: TestRenderer});
    const held: {form?: UseFormReturn} = {};
    render(<Harness source={'<Blok kind="agent" context="panel"><Card /></Blok>'} held={held} />);

    expect(screen.queryByPlaceholderText('exposure')).toBeNull();
    expect(screen.getByText('Exposure')).toBeTruthy();
  });
});
