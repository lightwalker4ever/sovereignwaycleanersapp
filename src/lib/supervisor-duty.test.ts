import { describe, expect, it } from "vitest";
import { isSupervisorOnDuty } from "./supervisor-duty";

// 2026-01-01 is a Thursday (day-of-week 4).
describe("isSupervisorOnDuty", () => {
  it("is on duty when the weekly template includes that day-of-week", () => {
    const weekly = [{ supervisorId: "sup1", dayOfWeek: 4 }];
    expect(isSupervisorOnDuty("sup1", "2026-01-01", weekly, [])).toBe(true);
  });

  it("is not on duty when the weekly template has no entry for that day", () => {
    const weekly = [{ supervisorId: "sup1", dayOfWeek: 2 }];
    expect(isSupervisorOnDuty("sup1", "2026-01-01", weekly, [])).toBe(false);
  });

  it("an 'available' exception overrides a day not in the weekly template", () => {
    const weekly = [{ supervisorId: "sup1", dayOfWeek: 2 }];
    const exceptions = [{ supervisorId: "sup1", date: "2026-01-01", type: "available" as const }];
    expect(isSupervisorOnDuty("sup1", "2026-01-01", weekly, exceptions)).toBe(true);
  });

  it("an 'unavailable' exception overrides a day that is in the weekly template", () => {
    const weekly = [{ supervisorId: "sup1", dayOfWeek: 4 }];
    const exceptions = [{ supervisorId: "sup1", date: "2026-01-01", type: "unavailable" as const }];
    expect(isSupervisorOnDuty("sup1", "2026-01-01", weekly, exceptions)).toBe(false);
  });

  it("ignores another supervisor's weekly rows and exceptions", () => {
    const weekly = [{ supervisorId: "sup2", dayOfWeek: 4 }];
    const exceptions = [{ supervisorId: "sup2", date: "2026-01-01", type: "available" as const }];
    expect(isSupervisorOnDuty("sup1", "2026-01-01", weekly, exceptions)).toBe(false);
  });
});
