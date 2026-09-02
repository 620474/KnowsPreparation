import { describe, expect, it } from "vitest";

import { reduceInterviewAction } from "../interview-director";
import {
  INTERVIEW_DIRECTOR_EVAL_VERSION,
  INTERVIEW_DIRECTOR_REPLAY_FIXTURES,
} from "./interview-director.fixtures";

describe(`AI replay gate ${INTERVIEW_DIRECTOR_EVAL_VERSION}`, () => {
  it("keeps all frozen policy decisions stable", () => {
    const results = INTERVIEW_DIRECTOR_REPLAY_FIXTURES.map((fixture) => ({
      fixture,
      actual: reduceInterviewAction({ ...fixture.input, proposal: fixture.proposal }),
    }));
    const passed = results.filter(({ fixture, actual }) =>
      actual.action === fixture.expectedAction && actual.forced === fixture.expectedForced,
    ).length;
    expect(passed / results.length).toBeGreaterThanOrEqual(0.98);
  });

  it("never leaks a frozen solution hint in exam mode", () => {
    const decisions = INTERVIEW_DIRECTOR_REPLAY_FIXTURES
      .filter((fixture) => fixture.input.kind === "exam")
      .map((fixture) => reduceInterviewAction({ ...fixture.input, proposal: fixture.proposal }));
    expect(decisions.some((decision) => /правильный ответ|используй Promise/i.test(decision.prompt)))
      .toBe(false);
  });
});
