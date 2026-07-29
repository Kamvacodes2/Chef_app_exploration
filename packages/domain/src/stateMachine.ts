/**
 * Minimal explicit state-machine primitive.
 *
 * Blueprint section 8.1 requires that "one transition service owns each state
 * change" and that "arbitrary repository status updates are prohibited". The
 * concrete machines (chef application, purchase, booking, offer, payout) are
 * owned by later steps; this is the shared, dependency-free mechanism they will
 * be declared with, so every one of them denies unlisted transitions by default.
 */

export type TransitionMap<TState extends string> = Readonly<Record<TState, readonly TState[]>>;

export class IllegalTransitionError<TState extends string> extends Error {
  public readonly from: TState;
  public readonly to: TState;

  constructor(name: string, from: TState, to: TState) {
    super(`${name}: transition ${from} -> ${to} is not permitted`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
  }
}

export interface StateMachine<TState extends string> {
  readonly name: string;
  readonly states: readonly TState[];
  readonly initial: TState;
  readonly can: (from: TState, to: TState) => boolean;
  /** Returns `to` when the transition is legal, otherwise throws. */
  readonly transition: (from: TState, to: TState) => TState;
  readonly isTerminal: (state: TState) => boolean;
}

export function defineStateMachine<TState extends string>(config: {
  readonly name: string;
  readonly initial: TState;
  readonly transitions: TransitionMap<TState>;
}): StateMachine<TState> {
  const states = Object.keys(config.transitions) as TState[];

  if (!states.includes(config.initial)) {
    throw new Error(`${config.name}: initial state ${config.initial} is not declared`);
  }

  for (const [from, targets] of Object.entries(config.transitions) as [
    TState,
    readonly TState[],
  ][]) {
    for (const target of targets) {
      if (!states.includes(target)) {
        throw new Error(`${config.name}: ${from} targets undeclared state ${target}`);
      }
    }
  }

  const can = (from: TState, to: TState): boolean => (config.transitions[from] ?? []).includes(to);

  return {
    name: config.name,
    states,
    initial: config.initial,
    can,
    transition: (from, to) => {
      if (!can(from, to)) {
        throw new IllegalTransitionError(config.name, from, to);
      }
      return to;
    },
    isTerminal: (state) => (config.transitions[state] ?? []).length === 0,
  };
}
