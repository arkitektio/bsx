import {afterEach, describe, expect, it} from 'vitest';
import {
  ORKESTRATOR_CATALOG_ID,
  baseBlokView,
  baseCatalog,
  blokView,
  blokViewFor,
  catalogChain,
  defaultBlokView,
  forgetBlokCatalogs,
  isCatalogTarget,
  minorNeeded,
  orkestratorCatalog,
  parseSpecCatalog,
  registerBlokCatalog,
  setAppBlokCatalog,
} from './catalogs';
import {argFits, bindFits, bindKindsOf, diagnosticMessage, isExplicitId, kindIn, loadVocabulary} from './vocabulary';

describe('the synced vocabulary', () => {
  it('is version 2, with the one reserved list', () => {
    const vocabulary = loadVocabulary();
    expect(vocabulary.vocab).toBe(2);
    expect(vocabulary.reserved.has('deps')).toBe(true);
    expect(vocabulary.reserved.has('mutations')).toBe(true);
    expect(vocabulary.functions.get('str.template')?.keys).toEqual(['template', 'values']);
    expect(vocabulary.functions.get('logic.choose')?.requiredKeys).toEqual(['cond', 'then']);
    expect(vocabulary.functions.get('ui.copy')?.effect).toBe(true);
    // An action's logo reads only the task it is drawn against, and declares nothing.
    expect(kindIn(vocabulary.kinds.action, 'LOGO')).toMatchObject({roots: ['task'], locals: false});
    expect(kindIn(vocabulary.kinds.action, 'PANEL')).toBe(vocabulary.kinds.action);
    expect(vocabulary.blok).toMatchObject({component: 'Blok', contexts: {panel: 'PANEL', scene: 'SCENE', logo: 'LOGO'}, content: {SCENE: ['Scene', 'Space'], LOGO: ['Logo']}});
  });

  it('has then, never now, and the query effects (revision 2)', () => {
    const vocabulary = loadVocabulary();
    expect(vocabulary.dataRoots).toHaveProperty('then');
    expect(vocabulary.dataRoots).not.toHaveProperty('now');
    expect(vocabulary.reserved.has('then')).toBe(true);
    expect(vocabulary.reserved.has('query')).toBe(true);
    expect(vocabulary.reserved.has('now')).toBe(false);
    expect(vocabulary.kinds.agent.roots).toContain('then');
    expect(kindIn(vocabulary.kinds.action, 'LOGO').roots).not.toContain('then');
    expect(vocabulary.functions.get('query.refetch')).toMatchObject({effect: true, keys: ['query']});
    expect(vocabulary.functions.get('query.fetch_more')).toMatchObject({effect: true, keys: ['query', 'variables'], requiredKeys: ['query']});
    expect(vocabulary.functions.get('time.diff')?.keys).toEqual(['start', 'end']);
    expect(vocabulary.functions.has('fmt.duration')).toBe(true);
    for (const gone of ['time.since', 'time.until', 'fmt.relative_time']) expect(vocabulary.functions.has(gone)).toBe(false);
    expect(vocabulary.callKinds).not.toContain('query_refetch');
    expect(vocabulary.records.query.fields.map(field => field.key)).toContain('fetching_more');
    expect(Object.keys(vocabulary.theme.dataAttributes).sort()).toEqual(['busy', 'stale']);
    expect([vocabulary.vocab, vocabulary.minor]).toEqual([2, 3]);
    expect(vocabulary.baseCatalog).toBe('https://arkitekt.live/catalogs/base/v4');
    expect(Object.values(vocabulary.bundledCatalogs)).toEqual(['catalogs/base@4.json', 'catalogs/orkestrator@1.json']);
    expect(vocabulary.hostParts).toEqual(['args', 'arg', 'deps', 'dep', 'ask', 'returns', 'status', 'timeline']);
    expect(vocabulary.unportableVariants.has('before')).toBe(true);
    expect(vocabulary.unportableVariants.has('hover')).toBe(false);
  });

  it('says what a bind writes and what an argument takes', () => {
    const {locals} = loadVocabulary();
    expect(locals.fields).toEqual(['persist']);
    expect(bindKindsOf('FLOAT')).toEqual(['FLOAT', 'INT', 'QUANTITY']);
    expect(bindKindsOf('ANY')).toBeNull();
    expect(bindFits('STRING', 'ENUM')).toBe(true);
    expect(bindFits('BOOL', 'INT')).toBe(false);
    expect(bindFits('ANY', 'MODEL')).toBe(true);
    expect(argFits({kind: 'INT'}, {kind: 'FLOAT'})).toBe(true);
    expect(argFits({kind: 'FLOAT'}, {kind: 'INT'})).toBe(false);
    // No action port is ANY; an ANY local is checked against nothing.
    expect(argFits({kind: 'STRING'}, {kind: 'INT'})).toBe(false);
    expect(argFits({kind: 'ANY'}, {kind: 'INT'})).toBe(true);
    expect(bindFits('BOOL', 'ANY')).toBe(true);
    expect(argFits({kind: 'STRUCTURE', identifier: '@mikro/image'}, {kind: 'STRUCTURE', identifier: '@mikro/roi'})).toBe(false);
    expect(argFits({kind: 'STRUCTURE', identifier: '@mikro/image'}, {kind: 'STRUCTURE', identifier: '@mikro/image'})).toBe(true);
  });

  it('fills diagnostic messages like str.format', () => {
    expect(diagnosticMessage('roots.reserved', {name: 'task'})).toBe("'task' is reserved: no local, let or into may use it.");
    expect(diagnosticMessage('local.bind', {what: 'x'})).toContain('{name}');
  });

  it('tells explicit ids from derived ones', () => {
    expect(isExplicitId('ot2-monitor')).toBe(true);
    expect(isExplicitId('Card[0]')).toBe(false);
    expect(isExplicitId('a/b')).toBe(false);
  });
});

describe('the catalogs', () => {
  afterEach(() => forgetBlokCatalogs());

  it('ship as the vocabulary names them, the base catalog first', () => {
    const base = baseCatalog();
    expect([base.id, base.name, base.version, base.extends]).toEqual(['https://arkitekt.live/catalogs/base/v4', 'base', 4, null]);
    const orkestrator = orkestratorCatalog();
    expect([orkestrator.id, orkestrator.extends]).toEqual([ORKESTRATOR_CATALOG_ID, base.id]);
    expect(catalogChain(ORKESTRATOR_CATALOG_ID).map(catalog => catalog.name)).toEqual(['base', 'orkestrator']);
  });

  it('give a view of one catalog, which knows what is another\'s', () => {
    const base = baseBlokView();
    expect(base.label).toBe('base@4');
    expect(base.components.has('MikroScene')).toBe(false);
    expect(base.foreign.get('MikroScene')).toBe(ORKESTRATOR_CATALOG_ID);
    const orkestrator = blokView(ORKESTRATOR_CATALOG_ID);
    expect(orkestrator.label).toBe('base@4 + orkestrator@1');
    expect(orkestrator.components.get('MikroScene')?.service).toBe('mikro');
    expect(orkestrator.components.has('Button')).toBe(true);
    expect(orkestrator.components.get('args')?.kinds).toEqual(['assign']);
  });

  it('take in what an app registers, and read a blok against the catalog it names', () => {
    const lab = parseSpecCatalog(
      {id: 'https://acme.example/catalogs/lab/v1', name: 'lab', version: 1, minor: 2, extends: ORKESTRATOR_CATALOG_ID, components: [{name: 'Spectrum', props: [{key: 'bands', kind: 'LIST', since: 2}]}]},
      'lab',
    );
    expect(blokViewFor(lab.id).complete).toBe(false);
    registerBlokCatalog(lab);
    const view = blokViewFor(lab.id);
    expect(view.complete).toBe(true);
    expect(['Spectrum', 'MikroScene', 'Button'].every(name => view.components.has(name))).toBe(true);
    expect(minorNeeded({component: 'Blok', children: [{component: 'Spectrum', props: [{key: 'bands'}]}]}, view)).toBe(2);
    expect(minorNeeded({component: 'Blok', children: [{component: 'Spectrum'}]}, view)).toBe(0);
    expect(blokViewFor(null).label).toBe('base@4');
  });

  it('are the app\'s own view once it says what it draws', () => {
    expect(defaultBlokView().label).toBe('base@4');
    setAppBlokCatalog(ORKESTRATOR_CATALOG_ID);
    expect(defaultBlokView().components.has('MikroScene')).toBe(true);
    setAppBlokCatalog(parseSpecCatalog({name: 'mine', components: [{name: 'Gauge', props: []}]}, 'mine'));
    expect(defaultBlokView().label).toBe('base@4 + mine');
  });

  it('take the app\'s own catalog over the snapshot that ships under its id, and never replace the base', () => {
    const live = parseSpecCatalog(
      {id: ORKESTRATOR_CATALOG_ID, name: 'orkestrator', version: 1, minor: 3, extends: baseCatalog().id, components: [{name: 'MikroScene', props: []}, {name: 'Fresh', props: []}]},
      'orkestrator',
    );
    setAppBlokCatalog(live);
    expect(defaultBlokView().components.has('Fresh')).toBe(true);
    expect(blokViewFor(ORKESTRATOR_CATALOG_ID).components.has('Fresh')).toBe(true);
    expect(baseBlokView().foreign.get('Fresh')).toBe(ORKESTRATOR_CATALOG_ID);
    registerBlokCatalog(parseSpecCatalog({id: baseCatalog().id, name: 'base', version: 4, components: []}, 'base'));
    expect(baseBlokView().components.has('Button')).toBe(true);
  });

  it('refuse a catalog that redefines what it extends, or names no catalog address', () => {
    const redefining = parseSpecCatalog({id: 'https://acme.example/catalogs/x/v1', name: 'x', version: 1, components: [{name: 'Button', props: []}]}, 'x');
    expect(() => registerBlokCatalog(redefining)).toThrow(/redefines <Button> of base@4/);
    expect(() => parseSpecCatalog({id: 'http://acme.example/catalogs/x/v1', name: 'x', components: []}, 'x')).toThrow(/not the address of a catalog/);
    expect(isCatalogTarget('ui@1')).toBe(false);
    expect(isCatalogTarget(ORKESTRATOR_CATALOG_ID) && isCatalogTarget('mine')).toBe(true);
  });
});

describe('what a blok may do', () => {
  it('is pure, or one effect: a command on a task, or something only the viewer sees', () => {
    const functions = [...loadVocabulary().functions.values()];
    const effects = functions.filter(fn => fn.effect);
    // A command is always an effect, never something an expression may compute with.
    expect(functions.filter(fn => fn.command && !fn.effect)).toEqual([]);
    expect(effects.filter(fn => fn.command).map(fn => fn.name).sort()).toEqual([
      'assign.start',
      'task.answer',
      'task.cancel',
      'task.interrupt',
      'task.pause',
      'task.resume',
      'task.step',
    ]);
    // What is left changes nothing but the viewer's own screen and clipboard.
    expect(effects.filter(fn => !fn.command).map(fn => fn.name).sort()).toEqual(['query.fetch_more', 'query.refetch', 'ui.copy']);
  });
});
