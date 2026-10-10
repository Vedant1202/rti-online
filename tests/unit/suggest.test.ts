import { describe, it, expect } from "vitest";
import { suggestAuthorities } from "@/lib/rti/suggest-authority";
import { detectStateBody } from "@/lib/rti/state-body";
import authorities from "@/data/authorities.json";

const list = authorities.map((a) => ({ id: a.code, name: a.name, keywords: a.keywords }));

describe("suggestAuthorities", () => {
  it("suggests Railways for a train ticket refund", () => {
    expect(suggestAuthorities("I want details of my train ticket refund for PNR 123", list)[0]?.id).toBe("MORLY");
  });

  it("matches Hindi keywords", () => {
    expect(suggestAuthorities("मेरी पेंशन कब शुरू होगी?", list)[0]?.id).toBe("DOPPW");
  });

  it("ranks by number of matching keywords and returns at most 3", () => {
    const r = suggestAuthorities("pension gratuity and a train ticket", list);
    expect(r[0].id).toBe("DOPPW");
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("returns nothing when no keyword matches", () => {
    expect(suggestAuthorities("hello world", list)).toEqual([]);
  });

  it("doesn't match keywords inside other words", () => {
    expect(suggestAuthorities("I trained for the marathon", list)).toEqual([]);
  });
});

describe("detectStateBody", () => {
  it("flags municipal and panchayat bodies", () => {
    expect(detectStateBody("Copy of the Pune Municipal Corporation water tender")).toBe("municipal corporation");
    expect(detectStateBody("Funds received by our gram panchayat")).toBe("gram panchayat");
  });

  it("flags a named state government and Delhi's government", () => {
    expect(detectStateBody("Orders issued by the Government of Maharashtra")).toBe("government of maharashtra");
    expect(detectStateBody("Delhi government school admission data")).toBe("delhi government");
  });

  it("flags Hindi terms", () => {
    expect(detectStateBody("नगर निगम द्वारा सड़क निर्माण")).toBe("नगर निगम");
  });

  it("doesn't flag central matters", () => {
    expect(detectStateBody("Status of my central government pension from the Ministry of Railways")).toBeNull();
    expect(detectStateBody("Passport verification by the Ministry of Home Affairs")).toBeNull();
  });
});
