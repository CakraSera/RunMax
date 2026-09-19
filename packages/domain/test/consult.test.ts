// PRD §10 consult fixtures: the saved Log must trip the same pure-rule gates
// Weeksmith's tools use. Offline, no model — parseCues is the oracle.
import { describe, expect, it } from "vitest";
import { parseCues } from "../src/domain.js";

describe("consult-pain-log", () => {
  it("a consult Log mentioning lutut nyeri trips the pain gate", () => {
    const log = "lutut agak nyeri, jalan aja. minggu lalu santai";
    const cues = parseCues(log);
    expect(cues.pain).toBe(true);
    expect(cues.walkRequest).toBe(true);
  });

  it("consult Log with no pain cues stays clean", () => {
    const cues = parseCues("minggu ini 20 menit easy, semuanya kencang");
    expect(cues.pain).toBe(false);
  });
});

describe("consult-handoff-once", () => {
  it("saved Log (even empty) is a legal BuildThisWeek input", () => {
    // The handoff reads the LogStore at execution time; empty is a real save.
    expect(parseCues("").pain).toBe(false);
  });
});

describe("consult-no-dx", () => {
  it("dada pegal is a pain cue, and the copy rule lives in checkWeek not parse", () => {
    const cues = parseCues("dada pegal abis lari");
    expect(cues.pain).toBe(true);
  });
});
