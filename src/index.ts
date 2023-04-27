import initialization, { Action, Atom, CursorAction } from "./record";
import { replay } from "./replay";

export interface StartParams {
  /**
   * this method will persistent called.
   * @param events
   * @param fullSnapshot if fullSnapshot exists, it means it has collected just now. Otherwise it's null.
   * @returns
   */
  emit: (
    events: Partial<{
      actions: Action[];
      cursors: CursorAction[];
    }> | null,
    fullSnapshot?: Atom | null
  ) => void;
  /**
   * specifying start time for record
   */
  recordAfter?: "load" | "DOMContentLoaded";
}

export interface ReplayParams {
  fullSnapshot: Atom;
  actions: Action[];
  cursors: CursorAction[];
}

export default {
  start: (arg: StartParams) => {
    if (!arg.recordAfter) {
      arg.recordAfter = "load";
    }
    initialization(arg);
  },
  replay: (arg: ReplayParams) => {
    replay(arg);
  },
};
