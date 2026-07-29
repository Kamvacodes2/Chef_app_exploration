import { describe, expect, it } from "vitest";
import { defineStateMachine, IllegalTransitionError } from "../../src/index.js";

const machine = defineStateMachine({
  name: "example",
  initial: "DRAFT",
  transitions: {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["APPROVED", "CANCELLED"],
    APPROVED: [],
    CANCELLED: [],
  },
});

describe("defineStateMachine", () => {
  it("declares its states and initial state", () => {
    expect(machine.initial).toBe("DRAFT");
    expect([...machine.states].sort()).toEqual(["APPROVED", "CANCELLED", "DRAFT", "SUBMITTED"]);
  });

  it("permits declared transitions", () => {
    expect(machine.can("DRAFT", "SUBMITTED")).toBe(true);
    expect(machine.transition("SUBMITTED", "APPROVED")).toBe("APPROVED");
  });

  it("denies anything not declared — deny by default", () => {
    expect(machine.can("DRAFT", "APPROVED")).toBe(false);
    expect(() => machine.transition("DRAFT", "APPROVED")).toThrow(IllegalTransitionError);
  });

  it("carries the attempted transition on the error", () => {
    try {
      machine.transition("APPROVED", "DRAFT");
      expect.unreachable("expected a rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalTransitionError);
      expect((error as IllegalTransitionError<string>).from).toBe("APPROVED");
      expect((error as IllegalTransitionError<string>).to).toBe("DRAFT");
    }
  });

  it("identifies terminal states", () => {
    expect(machine.isTerminal("APPROVED")).toBe(true);
    expect(machine.isTerminal("CANCELLED")).toBe(true);
    expect(machine.isTerminal("DRAFT")).toBe(false);
  });

  it("rejects a definition whose initial state is not declared", () => {
    expect(() =>
      defineStateMachine({ name: "bad", initial: "MISSING", transitions: { A: [] } as never }),
    ).toThrow(/initial state/);
  });

  it("rejects a transition targeting an undeclared state", () => {
    expect(() =>
      defineStateMachine({
        name: "bad",
        initial: "A",
        transitions: { A: ["GHOST"] } as never,
      }),
    ).toThrow(/undeclared state/);
  });
});
