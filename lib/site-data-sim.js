// site-data-sim.js: the four simulation icons for the hub's icon strip (rendered by
// tools/gen-site-icons-sim.mjs from the course's own simulators) and their facts. Every fact carries
// its source; the course's own numbers come from lib/core/sim-cloth.js, lib/core/sim-fluid.js and
// lib/tests/sim.test.mjs.

export const EXTRA_ICONS = [
  {
    id: 'sim-cloth', img: 'media/icons/sim-cloth.png', title: 'Cloth on a sphere', sub: 'simulated for this course',
    facts: [
      { t: 'This cloth is 1,600 particles held by distance constraints, dropped onto a sphere and simulated for 3 seconds in 20 substeps per frame before this frame was rendered.', src: 'tools/site-icons-sim.html; lib/core/sim-cloth.js' },
      { t: 'Terzopoulos, Platt, Barr and Fleischer introduced physically based deformable models to graphics in 1987, including cloth draped over objects.', src: 'Terzopoulos et al., “Elastically Deformable Models,” SIGGRAPH 1987' },
      { t: 'Baraff and Witkin made cloth practical in 1998 with implicit integration, which stays stable at large time steps; the work earned a technical Academy Award, shared with Michael Kass, in 2006.', src: 'Baraff and Witkin, “Large Steps in Cloth Simulation,” SIGGRAPH 1998 · https://history.siggraph.org/learning/large-steps-in-cloth-simulation-by-baraff-and-witkin/' },
      { t: 'Stiff springs with explicit steps explode: in this course’s cloth, a spring stiffness of 2,000 N/m explodes at 4 substeps per frame and settles at 64.', src: 'lib/tests/sim.test.mjs' },
    ],
  },
  {
    id: 'sim-splash', img: 'media/icons/sim-splash.png', title: 'A splash', sub: 'SPH, simulated for this course',
    facts: [
      { t: 'This splash is 1,500 particles of a 2D smoothed particle hydrodynamics fluid, a drop falling into a pool, rendered 0.27 simulated seconds after it started.', src: 'tools/site-icons-sim.html; lib/core/sim-fluid.js' },
      { t: 'Smoothed particle hydrodynamics came from astrophysics in 1977; Müller, Charypar and Gross brought it to interactive graphics in 2003.', src: 'Müller et al., “Particle-Based Fluid Simulation for Interactive Applications,” SCA 2003' },
      { t: 'Jos Stam’s “Stable Fluids” (1999) made grid fluids unconditionally stable; the Maya Fluid Effects system built on it earned Stam and three colleagues a technical Academy Award in 2008.', src: 'Stam, SIGGRAPH 1999 · https://investors.autodesk.com/news-releases/news-release-details/autodesk-receives-scientific-technical-academy-award-maya-fluid' },
      { t: 'Not every simulated material is a liquid: Disney’s snow in Frozen (2013) was simulated with the material point method, a hybrid of particles and a grid, in about 43 shots.', src: 'Stomakhin et al., SIGGRAPH 2013 · https://newsroom.ucla.edu/stories/math-wizards-create-snow-for-disney-263913' },
    ],
  },
  {
    id: 'sim-rigid', img: 'media/icons/sim-rigid.png', title: 'Tumbling cubes', sub: 'particles and constraints',
    facts: [
      { t: 'Each cube here is 8 particles held by all 28 pairwise distance constraints: rigid bodies built from the same solver as the cloth, thrown spinning and caught mid-tumble.', src: 'lib/core/sim-cloth.js (addCube); tools/site-icons-sim.html' },
      { t: 'Thomas Jakobsen’s GDC 2001 talk “Advanced Character Physics” showed particles, Verlet integration and constraint relaxation running the ragdolls and cloth of the game Hitman.', src: 'Jakobsen, GDC 2001 · https://www.researchgate.net/publication/277285660_Advanced_Character_Physics' },
      { t: 'Position based dynamics (Müller, Heidelberger, Hennix and Ratcliff, 2007) generalized the idea: move particles to satisfy constraints, then read velocities off the moves. XPBD (2016) made the stiffness independent of the step.', src: 'Müller et al., J. Visual Communication and Image Representation, 2007; Macklin, Müller and Chentanez, MIG 2016' },
    ],
  },
  {
    id: 'sim-hair', img: 'media/icons/sim-hair.png', title: 'Hair in the wind', sub: 'simulated for this course',
    facts: [
      { t: 'This head has 240 strands, each 14 links with bending links over every second particle, simulated in a gusting wind for 2 seconds.', src: 'lib/core/sim-cloth.js (makeHair); tools/site-icons-sim.html' },
      { t: 'Merida in Pixar’s Brave (2012) has more than 1,500 sculpted curls making about 111,700 hairs, simulated with a new solver the team named Taz.', src: 'https://www.fxguide.com/fxfeatured/brave-new-hair/' },
      { t: 'Kajiya and Kay’s 1989 lighting model shades a strand by its tangent rather than a normal, which produces the band-shaped highlight a head of hair shows.', src: 'Kajiya and Kay, “Rendering Fur with Three Dimensional Textures,” SIGGRAPH 1989' },
      { t: 'Selle, Lentine and Fedkiw simulated each hair as particles joined by stretch, bend and twist springs, with extra altitude springs so a strand keeps its volume, in 2008.', src: 'Selle, Lentine and Fedkiw, “A Mass Spring Model for Hair Simulation,” SIGGRAPH 2008' },
    ],
  },
];
