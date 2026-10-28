import type {inspectorContracts} from '../../../catalogs/parts/inspector';
import type {BlokRender} from '../../runtime';

type Contracts = typeof inspectorContracts;

const RawInspectorRender: BlokRender<Contracts['RawInspector']> = ({component}) => {
  return (
    <details>
      <summary>Raw Component State (ID: {component.id})</summary>
      <pre>{JSON.stringify(component.props ?? [], null, 2)}</pre>
    </details>
  );
};

export const inspectorRenders = {
  RawInspector: RawInspectorRender,
};
