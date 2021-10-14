import { GetState, SetState, StateCreator, StoreApi } from 'zustand/vanilla';
import { createUndoStore, UndoStoreState } from './factory';
import { filterState } from './utils';
import isEqual from 'lodash/isEqual';

export type UndoState = Partial<
  Pick<UndoStoreState, 'undo' | 'redo' | 'clear'> & {
    getState: () => UndoStoreState;
  }
>;

export interface Options {
  // TODO: improve this type. ignored should only be fields on TState
  omit?: string[];
  allowUnchanged?: boolean;
}

// custom zustand middleware to get previous state
export const undoMiddleware = <TState extends UndoState>(
  config: StateCreator<TState>,
  options?: Options
) => (set: SetState<TState>, get: GetState<TState>, api: StoreApi<TState>) => {
  const undoStore = createUndoStore();
  const { getState, setState } = undoStore;
  return config(
    args => {
      /* TODO: const, should call this function and inject the values once, but it does
        it on every action call currently. */
      const { undo, clear, redo } = getState();
      const prevStates = getState().prevStates;

      // Get the last state before updating state
      const lastState = filterState({ ...get() }, options?.omit || []);

      // inject helper functions to user defined store.
      set({
        undo,
        clear,
        redo,
        getState,
      });

      set(args);

      // Get the current state after updating state
      const currState = filterState({ ...get() }, options?.omit || []);
      
      // Only store changes if state isn't equal (or option has been set)
      const shouldStoreChange =
        !isEqual(lastState, currState) || options?.allowUnchanged;

      if (shouldStoreChange) {
        setState({
          prevStates: [...prevStates, lastState],
          setStore: set,
          futureStates: [],
          getStore: get,
          options,
        });
      }
    },
    get,
    api
  );
};

export default undoMiddleware;
