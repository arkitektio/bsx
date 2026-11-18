// @vitest-environment jsdom
import {act, cleanup, fireEvent, render} from '@testing-library/react';
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
