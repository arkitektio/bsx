import {describe, expect, it} from 'vitest';
import corpus from './bsx_v2.json';
import {bindingFits, fits, literalPort} from './fit';
import {parsePort, portSummary, TEXT_PORT} from './ports';
import {loadVocabulary} from './vocabulary';

type FitCase = {name: string; source: unknown; target: unknown; status: string};

const cases = (corpus as unknown as {fits: FitCase[]}).fits;

describe('fits, against the corpus', () => {
  it('has the cases', () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases.map(entry => [entry.name, entry] as const))('%s', (name, entry) => {
    expect(fits(parsePort(entry.source, name), parsePort(entry.target, name)).status).toBe(entry.status);
  });
});

describe('a binding', () => {
  const {bindKinds} = loadVocabulary().locals;
  const port = (kind: string) => ({kind});

  it('relaxes as bind_kinds says, for each row', () => {
    for (const [writes, locals] of Object.entries(bindKinds)) {
      for (const local of locals) {
        if (local === 'LIST' || local === 'DICT' || local === 'MODEL') continue;
        expect(bindingFits(port(local), port(writes), bindKinds).status, `${writes} -> ${local}`).toBe('ok');
      }
    }
    expect(bindingFits(port('INT'), port('BOOL'), bindKinds).status).toBe('mismatch');
    expect(bindingFits(port('STRING'), port('FLOAT'), bindKinds).status).toBe('mismatch');
  });

  it('writes a structure into a local of that structure', () => {
    const any = {kind: 'STRUCTURE', identifier: '*'};
    expect(bindingFits({kind: 'STRUCTURE', identifier: '@mikro/image'}, any, bindKinds).status).toBe('ok');
    expect(bindingFits({kind: 'STRING'}, any, bindKinds).status).toBe('mismatch');
  });
});

describe('a literal', () => {
  it('is checked by its kind and as its one choice', () => {
    expect(fits(literalPort(3), {kind: 'FLOAT'}).status).toBe('ok');
    expect(fits(literalPort(true), TEXT_PORT).status).toBe('ok');
    expect(fits(literalPort('x'), {kind: 'STRING', choices: [{value: 'a'}]}).status).toBe('mismatch');
    expect(fits(literalPort([1]), {kind: 'STRING'}).status).toBe('open');
  });

  it('a task record (a DICT) fits a DICT of named fields', () => {
    const record = {kind: 'DICT', children: [{key: 'status', kind: 'STRING'}, {key: 'args', kind: null}]};
    expect(fits(record, {kind: 'DICT', children: [{key: 'status', kind: 'STRING'}]}).status).toBe('ok');
    expect(fits(record, {kind: 'MODEL', children: [{key: 'status', kind: 'STRING'}]}).status).toBe('mismatch');
  });
});

describe('portSummary', () => {
  it('says a port as one line', () => {
    expect(portSummary(TEXT_PORT)).toBe('STRING | INT | FLOAT | BOOL');
    expect(portSummary({kind: 'LIST', children: [{key: '...', kind: 'STRING'}]})).toBe('LIST<STRING>');
    expect(portSummary({kind: 'CALLBACK', children: [{key: 'value', kind: 'BOOL'}]})).toBe('CALLBACK(value: BOOL)');
    expect(portSummary({kind: 'STRING', choices: [{value: 'a'}]})).toBe("'a'");
  });
});
