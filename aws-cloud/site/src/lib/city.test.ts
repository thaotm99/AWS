// npx tsx src/lib/city.test.ts  (from aws-cloud/site)
import assert from "node:assert/strict";
import { BUILDINGS, EVENTS, START, available, baseDemand, build, cityLevel, demolish, freeSlot, nextEvent, playDay, simulate, type Placed } from "./city";

// The starting city: a factory in each district and one bank in district A, enough for an ordinary day.
const ok = simulate(START.placed, { demand: baseDemand(7) });
assert.equal(ok.capacity, 1600);
assert.equal(ok.errors, 0);
assert.ok(ok.latency < 200);
// Three times the residents overload it.
const rush = simulate(START.placed, { demand: baseDemand(4) * 3 * 2 });
assert.ok(rush.errors > 0.5 && rush.latency > 1000);

// District A loses power: with everything in A, the bank is gone; a standby in B keeps orders going.
const twoZones: Placed = { ...START.placed, b2: "standby" };
assert.equal(simulate(START.placed, { demand: 600, down: "a" }).bankDown, true, "the only bank is in A");
const storm = simulate(twoZones, { demand: 600, down: "a" });
assert.equal(storm.bankDown, false);
assert.equal(storm.errors, 0);
// Without the dispatch station, district B gets no traffic.
const noRouter = { ...twoZones };
delete noRouter.router;
assert.equal(simulate(noRouter, { demand: 600 }).capacity, 800);


// The gate cuts latency for faraway visitors; the wall stops the attack; the post office keeps orders.
assert.ok(simulate({ ...START.placed, gate: "gate" }, { demand: 600, far: true }).latency < simulate(START.placed, { demand: 600, far: true }).latency - 200);
assert.ok(simulate({ ...START.placed, wall: "wall" }, { demand: 600, attack: true }).errors < simulate(START.placed, { demand: 600, attack: true }).errors);
assert.equal(simulate({ ...START.placed, c2: "post" }, { demand: 600, warehouseClosed: true }).ordersLost, 0);
assert.ok(simulate(START.placed, { demand: 600, warehouseClosed: true }).ordersLost > 0);
// The café takes the read load off the bank.
assert.ok(simulate({ ...START.placed, b1: "factory", b3: "factory", c2: "cafe" }, { demand: 2000, dbShare: 1.2 }).latency < simulate({ ...START.placed, b1: "factory", b3: "factory" }, { demand: 2000, dbShare: 1.2 }).latency);

// Levels follow the curriculum layers started.
const layers = [["aws-map"], ["vpc"], ["iam", "security"], ["ec2"], ["s3"], ["rds"], ["messaging"]];
assert.equal(cityLevel(layers, new Set()), 1);
assert.equal(cityLevel(layers, new Set(["vpc", "security", "rds"])), 4);
assert.equal(cityLevel(layers, new Set(layers.flat())), 7);

// Building: right slot kind and enough money; demolishing returns half.
const s1 = build(START, "b3", "factory")!;
assert.equal(s1.money, START.money - BUILDINGS.factory.price);
assert.equal(build(START, "gate", "factory"), null);
assert.equal(build(START, "b1", "factory"), null, "the plot is taken");
assert.equal(build({ ...START, money: 10 }, "b3", "factory"), null);
assert.equal(demolish(s1, "b3").money, s1.money + BUILDINGS.factory.price / 2);
// A standby goes to the district without the main bank.
assert.equal(freeSlot(START.placed, "standby")!.zone, "b");

// A choice that builds needs the lesson; playing a day settles money and moves to the next day.
const storm1 = EVENTS.find((e) => e.id === "storm")!;
const buildFactory = storm1.choices.find((c) => c.build === "factory")!;
assert.ok(available(buildFactory, START, new Set()));
const far = EVENTS.find((e) => e.id === "far")!;
assert.ok(!available(far.choices.find((c) => c.build === "gate")!, START, new Set()), "the gate needs the CloudFront lesson");
assert.ok(available(far.choices.find((c) => c.build === "gate")!, START, new Set(["cloudfront"])));
const played = playDay(START, storm1, buildFactory, 4);
assert.equal(played.state.day, 2);
assert.equal(Object.values(played.state.placed).filter((b) => b === "factory").length, 3);
assert.ok(played.result.errors <= played.before.errors);
// Every event has one good choice and both languages.
for (const e of EVENTS) {
  assert.equal(e.choices.filter((c) => c.verdict === "good" && !c.needs).length, 1, e.id);
  for (const c of e.choices) assert.ok(c.text.en && c.outcome.vi && c.outcome.en);
}
// Events come round before repeating.
let st = START;
const ids = new Set<string>();
for (let i = 0; i < EVENTS.length; i++) {
  const e = nextEvent(st, 7);
  ids.add(e.id);
  st = playDay(st, e, e.choices[1], 7).state;
}
assert.equal(ids.size, EVENTS.length);
// An ordinary day pays for the starting city's upkeep.
const ordinary = simulate(START.placed, { demand: baseDemand(1) });
assert.ok(ordinary.income > ordinary.upkeep, `${ordinary.income} > ${ordinary.upkeep}`);
console.log("city: ok");
