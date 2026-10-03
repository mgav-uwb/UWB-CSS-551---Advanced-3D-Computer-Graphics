// site-data-sim.js: the four simulation icons for the hub's icon strip (rendered by
// tools/gen-site-icons-sim.mjs from the course's own simulators) and their facts. Every fact carries
// its source; the course's own numbers come from lib/core/sim-cloth.js, lib/core/sim-fluid.js and
// lib/tests/sim.test.mjs.

export const EXTRA_ICONS = [
  {
    id: 'sim-cloth', img: 'media/icons/sim-cloth.webp', title: 'Cloth on a sphere', sub: 'simulated for this course',
    facts: [
      { t: 'This cloth is a 48 × 48 grid of particles held by distance constraints, dropped onto a sphere and swaying in a breeze: 24 substeps of 2 constraint iterations per frame keep it stable where one iteration explodes on contact.', src: 'tools/site-anim-a.html; lib/core/sim-cloth.js' },
      { t: 'Terzopoulos, Platt, Barr and Fleischer introduced physically based deformable models to graphics in 1987, including cloth draped over objects.', src: 'Terzopoulos et al., “Elastically Deformable Models,” SIGGRAPH 1987' },
      { t: 'Baraff and Witkin made cloth practical in 1998 with implicit integration, which stays stable at large time steps.', src: 'Baraff and Witkin, “Large Steps in Cloth Simulation,” SIGGRAPH 1998 · https://history.siggraph.org/learning/large-steps-in-cloth-simulation-by-baraff-and-witkin/' },
      { t: 'Stiff springs with explicit steps explode: in this course’s cloth, a spring stiffness of 2,000 N/m explodes at 4 substeps per frame and settles at 64.', src: 'lib/tests/sim.test.mjs' },
      { t: 'XPBD (Macklin, Müller and Chentanez, 2016) makes constraint stiffness independent of the step and iteration count; Macklin et al. (2019) showed that many small substeps beat many iterations, the setting this loop uses.', src: 'Macklin, Müller and Chentanez, “XPBD,” Motion in Games 2016; Macklin et al., “Small Steps in Physics Simulation,” SCA 2019' },
    ],
  },
  {
    id: 'sim-splash', img: 'media/icons/sim-splash.webp', title: 'A splash', sub: 'a height field and ballistic droplets, simulated for this course',
    facts: [
      { t: 'This loop is a height field (a 220 × 220 grid of water heights) stepped by the wave equation with damping, the model Kass and Miller used for water in 1990; they solved it implicitly, this loop steps it explicitly 120 times a second. The crown\u2019s rim breaks into droplets that fly ballistically, and each landing adds a ripple.', src: 'Kass and Miller, “Rapid, Stable Fluid Dynamics for Computer Graphics,” SIGGRAPH 1990; tools/site-splash.html https://history.siggraph.org/learning/rapid-stable-fluid-dynamics-for-computer-graphics-by-kass-and-miller/' },
      { t: 'The crown, its pointed rim and the jet that shoots up from the center after the crater collapses were first photographed by Arthur Worthington with electric-spark flashes; his book A Study of Splashes (1908) has 197 illustrations. The central column is still called the Worthington jet.', src: 'Worthington, A Study of Splashes, 1908 · https://www.gutenberg.org/ebooks/39831' },
      { t: 'Smoothed particle hydrodynamics came from astrophysics in 1977; Müller, Charypar and Gross brought it to interactive graphics in 2003.', src: 'Müller et al., “Particle-Based Fluid Simulation for Interactive Applications,” SCA 2003' },
      { t: 'Jos Stam’s “Stable Fluids” (1999) made grid fluids unconditionally stable; the Maya Fluid Effects system built on it earned Stam and three colleagues a technical Academy Award in 2008.', src: 'Stam, SIGGRAPH 1999 · AMPAS, 80th Scientific and Technical Awards (2008), Technical Achievement Award · https://investors.autodesk.com/news-releases/news-release-details/autodesk-receives-scientific-technical-academy-award-maya-fluid' },
      { t: 'Not every simulated material is a liquid: Disney’s snow in Frozen (2013) was simulated with the material point method, a hybrid of particles and a grid, in about 43 shots.', src: 'Stomakhin et al., SIGGRAPH 2013 · https://newsroom.ucla.edu/stories/math-wizards-create-snow-for-disney-263913' },
    ],
  },
  {
    id: 'sim-rigid', img: 'media/icons/sim-rigid.webp', title: 'Tumbling cubes', sub: 'colliding, simulated for this course',
    facts: [
      { t: 'Nine cubes fall and collide with the floor and with each other: each cube is 245 spheres held rigid by shape matching, with friction and restitution, and a check confirms no two cubes overlap by more than 1% of an edge at rest.', src: 'tools/rigid-sim.mjs; tools/rigid-sim.check.mjs' },
      { t: 'Thomas Jakobsen’s GDC 2001 talk “Advanced Character Physics” showed particles, Verlet integration and constraint relaxation running the ragdolls and cloth of the game Hitman.', src: 'Jakobsen, GDC 2001 · https://www.researchgate.net/publication/277285660_Advanced_Character_Physics' },
      { t: 'Position based dynamics (Müller, Heidelberger, Hennix and Ratcliff, 2007) generalized the idea: move particles to satisfy constraints, then read velocities off the moves. XPBD (2016) made the stiffness independent of the step.', src: 'Müller et al., J. Visual Communication and Image Representation, 2007; Macklin, Müller and Chentanez, MIG 2016' },
      { t: 'Rigid bodies as clusters of particles kept rigid by shape matching is the approach of NVIDIA’s unified particle solver (Macklin, Müller, Chentanez and Kim, 2014), building on Müller et al.’s shape matching (2005).', src: 'Macklin et al., “Unified Particle Physics for Real-Time Applications,” SIGGRAPH 2014 https://dl.acm.org/doi/10.1145/2601097.2601152' },
    ],
  },
  {
    id: 'sim-hair', img: 'media/icons/sim-hair.webp', title: 'Hair in the wind: our simulation', sub: 'simulated for this course',
    facts: [
      { t: 'This head has about 1,800 simulated guide strands of 24 segments, each with 9 interpolated children: about 16,000 thin strands, lit with the Kajiya-Kay model and blown back by a gusting wind.', src: 'tools/site-anim-a.html' },
      { t: 'Merida in Pixar’s Brave (2012) has more than 1,500 sculpted curls making about 111,700 hairs, simulated with a new solver the team named Taz.', src: 'https://www.fxguide.com/fxfeatured/brave-new-hair/' },
      { t: 'Kajiya and Kay’s 1989 lighting model shades a strand by its tangent rather than a normal, which produces the band-shaped highlight a head of hair shows.', src: 'Kajiya and Kay, “Rendering Fur with Three Dimensional Textures,” SIGGRAPH 1989' },
      { t: 'Selle, Lentine and Fedkiw simulated each hair as particles joined by stretch, bend and twist springs, with extra altitude springs so a strand keeps its volume, in 2008.', src: 'Selle, Lentine and Fedkiw, “A Mass Spring Model for Hair Simulation,” SIGGRAPH 2008' },
      { t: 'Each guide is simulated with follow-the-leader constraints: every particle is moved to exactly one segment length from its parent, which keeps hair inextensible at any step size (Müller, Kim and Chentanez, 2012).', src: 'Müller, Kim and Chentanez, “Fast Simulation of Inextensible Hair and Fur,” VRIPHYS 2012' },
    ],
  },
];
