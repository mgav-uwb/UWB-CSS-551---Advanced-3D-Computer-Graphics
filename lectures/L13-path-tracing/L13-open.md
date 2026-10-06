<!--
  CSS 551 · Lecture 13 (Thursday November 12, in person): the midterm, then
  Path Tracing and the Cornell Box.
  Mounts, in order: L13-open.md, ../../topics/path-tracing.md (~34 min),
  L13-discuss.md (the HW6 walk-through and the wrap; no discussion slot tonight).

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  MIDTERM, on paper, weeks 1–6                              75 min
    1:15  break and collection                                      3 min
    1:18  opening                                                    1 min
    1:19  path tracing (topic, 24 content slides, brisk)            37 min
    1:56  HW6 walk-through                                           3 min
    1:59  wrap                                                       1 min
    2:00  end
  No quiz this week. Numbers: numbers-motion.json rt.monteCarlo and rt.cornell;
  tools/gen-lecture-figures-c.mjs (l13_*).
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 13: Path Tracing and the Cornell Box**

> Eric Veach's 1997 thesis introduced multiple importance sampling; his research on efficient Monte Carlo path tracing later earned him an Academy Scientific and Technical award.

<small>Veach, PhD thesis, Stanford, 1997; Academy Scientific and Technical Award, 2014</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **5:45–7:00**: the **midterm**, weeks 1–6, 75 minutes, on paper
- **7:00–7:03**: collection and a short break
- **7:03–7:45**: **path tracing**: the Monte Carlo estimator and why its error is 1/√N; drawing directions; stratification; soft shadows and depth of field as more dimensions; the path tracer in code; next-event estimation; Russian roulette and the furnace test; the Cornell box; fireflies, MIS, caustics and fog; the budget per frame
- then the **HW6** walk-through

Reading: [Ray Tracing](../../textbook/ray-tracing.html), sections 7 and 8, and [Light Transport and PBR](../../textbook/light-transport-pbr.html), section 11.

