// @vitest-environment jsdom
import {act, cleanup, createEvent, fireEvent, render} from '@testing-library/react';
import * as React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {parseBsx} from '../../bsx/parse';
import {Button} from '../../vendor/core/ui/button';
import BlokRenderer from '../BlokRenderer';
import {testCatalog} from './testing';

afterEach(cleanup);

// Every component of the catalog that draws a button, opened where it opens, so the buttons
// of its content are drawn too: the overlays render into the body, not into the form.
const SOURCE = `<Blok kind="agent" context="panel">
  <Button label="Plain" />
  <Button label="Acting" onClick={ui.copy("x")} />
  <Toggle label="Toggle" />
  <ToggleGroup><ToggleGroupItem value="a" label="A" /><ToggleGroupItem value="b" label="B" /></ToggleGroup>
  <Checkbox label="Check" />
  <Switch label="Switch" />
  <RadioGroup><RadioGroupItem value="a" label="A" /></RadioGroup>
  <Tabs defaultValue="one"><TabsList><TabsTrigger value="one" label="One" /><TabsTrigger value="two" label="Two" /></TabsList><TabsContent value="one"><Text>one</Text></TabsContent></Tabs>
  <Collapsible defaultOpen><CollapsibleTrigger label="More" /><CollapsibleContent><Button label="Inside" /></CollapsibleContent></Collapsible>
  <Accordion defaultValue="a"><AccordionItem value="a"><AccordionTrigger label="Section" /><AccordionContent><Text>a</Text></AccordionContent></AccordionItem></Accordion>
  <Tooltip><TooltipTrigger label="Hover" /><TooltipContent><Text>tip</Text></TooltipContent></Tooltip>
  <Popover defaultOpen><PopoverTrigger label="Pop" /><PopoverContent><Button label="In popover" /></PopoverContent></Popover>
  <Dialog defaultOpen><DialogTrigger label="Open" /><DialogContent><DialogClose label="Close" /><Button label="In dialog" /></DialogContent></Dialog>
  <DropdownMenu><DropdownMenuTrigger label="Menu" /><DropdownMenuContent><DropdownMenuItem label="Item" /></DropdownMenuContent></DropdownMenu>
  <Select><SelectTrigger placeholder="Pick" /><SelectContent><SelectItem value="a" label="A" /></SelectContent></Select>
  <DatePicker />
  <Combobox options={[{value: "a", label: "A"}]} />
  <Calendar />
  <Input placeholder="Text" />
  <Input type="number" placeholder="Number" />
  <InputOTP length={4} />
  <InputGroup><Input placeholder="Grouped" /></InputGroup>
  <Textarea placeholder="Long" />
</Blok>`;

describe('a blok drawn inside a form', () => {
  it('submits nothing: every button it draws is a button, not the form’s submit', async () => {
    const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submitted}>
        <BlokRenderer uiComponents={[parseBsx(SOURCE).tree]} catalog={testCatalog()} chrome="none" sizing="intrinsic" />
      </form>,
    );
    await act(async () => {});

    const buttons = Array.from(document.body.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(20);
    // jsdom says "submit" for a button that does not say what it is, as a browser does.
    const submitting = buttons.filter(button => button.type !== 'button').map(button => button.outerHTML.slice(0, 120));
    expect(submitting).toEqual([]);

    // And clicking them, the way someone filling in the form would, submits nothing.
    for (const button of buttons) {
      if (button.isConnected && !button.disabled) fireEvent.click(button);
    }
    await act(async () => {});
    expect(submitted).not.toHaveBeenCalled();
  });

  it('keeps Enter in its fields: a field of a blok does not submit the form either', async () => {
    const form = React.createRef<HTMLFormElement>();
    render(
      <form ref={form} onSubmit={event => event.preventDefault()}>
        <BlokRenderer uiComponents={[parseBsx(SOURCE).tree]} catalog={testCatalog()} chrome="none" sizing="intrinsic" />
      </form>,
    );
    await act(async () => {});

    // Every field the browser would submit on Enter: an input of this form that can be focused,
    // not the ones Radix keeps out of reach for a checkbox's, a switch's or a radio's value (the
    // open dialog hides the rest from assistive technology, which is why that is not the test).
    // jsdom does not submit on Enter itself, so what is checked is that the default is taken away.
    const fields = Array.from(document.body.querySelectorAll('input')).filter(
      input => input.form === form.current && input.type !== 'hidden' && input.tabIndex !== -1,
    );
    expect(fields.length).toBeGreaterThanOrEqual(4);
    const submitting = fields.filter(input => {
      const enter = createEvent.keyDown(input, {key: 'Enter'});
      fireEvent(input, enter);
      return !enter.defaultPrevented;
    });
    expect(submitting.map(input => input.outerHTML.slice(0, 120))).toEqual([]);

    // A textarea takes its Enter as a new line, as it always did.
    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement;
    const newline = createEvent.keyDown(textarea, {key: 'Enter'});
    fireEvent(textarea, newline);
    expect(newline.defaultPrevented).toBe(false);
  });

  it('keeps a submit that says it is one', () => {
    const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
    const {getByText} = render(
      <form onSubmit={submitted}>
        <Button type="submit">Send</Button>
      </form>,
    );
    fireEvent.click(getByText('Send'));
    expect(submitted).toHaveBeenCalledOnce();
  });
});
