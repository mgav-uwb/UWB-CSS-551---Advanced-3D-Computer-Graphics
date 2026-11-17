using System;
using System.Collections.Generic;

// ParticleLab.cs: one particle on one spring, and the steps that move it. Four integrators (explicit Euler, semi-implicit Euler,
// Verlet, implicit Euler), the exact motion they approximate, the growth of each integrator per step and the step at which it
// stops being bounded, the accumulator that keeps a simulation's step fixed while the frames are uneven, one spring stepped by
// the frame and by the accumulator, and a particle's contact with a plane and with a thin wall.
// Plain C#, no MonoBehaviour: a vector is a double[3], a result is a small class whose fields have the names and the order of
// the object particle.js returns. Doubles throughout, so that both tracks agree to the last digits. ParticleLabScene.cs draws it.
// No method changes its arguments.
// The same functions, line for line where the languages allow, are particle.js in ../webgl/
// (lib/tests/programs/particle-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class ParticleLab
{
    #region Settings and random numbers
    // EPSILON absorbs rounding when a time is compared with a step (16.667 ms six times is 100 ms, give or take 1e-14). The random
    // numbers are Park and Miller's integer generator (multiplier 48271, modulus 2^31 - 1): the state is an integer, so both tracks
    // draw the same frames.
    public const double EPSILON = 1e-9;
    public const long MODULUS = 2147483647;
    public const long MULTIPLIER = 48271;
    public const double GRAVITY = 9.81;

    public class RandomDraw { public long state; public double u; }

    public static RandomDraw NextState(long state)
    {
        long next = (state * MULTIPLIER) % MODULUS;
        double u = (double)next / MODULUS;
        return new RandomDraw { state = next, u = u };
    }
    #endregion

    #region The spring and its energy
    // A spring pulls with force -k x, a damper with -c v; Newton turns the total into an acceleration a = F / m. The natural
    // frequency is omega = sqrt(k / m) (the period is 2 pi / omega), and damping is critical at c = 2 sqrt(k m), where zeta = 1.
    // The energy 1/2 m v^2 + 1/2 k x^2 is constant for a spring without a damper: it is the number every integrator is judged by.
    public class SpringInfo { public double force, a, omega, energy, critical, zeta; }

    public static double SpringForce(double k, double c, double x, double v)
    {
        return -k * x - c * v;
    }

    public static double EnergyOf(double k, double m, double x, double v)
    {
        return 0.5 * m * v * v + 0.5 * k * x * x;
    }

    public static SpringInfo DescribeSpring(double k, double m, double c, double x, double v)
    {
        double force = SpringForce(k, c, x, v);
        double a = force / m;
        double omega = Math.Sqrt(k / m);
        double energy = EnergyOf(k, m, x, v);
        double critical = 2 * Math.Sqrt(k * m);
        double zeta = c / critical;
        return new SpringInfo { force = force, a = a, omega = omega, energy = energy, critical = critical, zeta = zeta };
    }
    #endregion

    #region One step of a spring
    // The three Euler steps differ in which state each update reads. Explicit Euler reads the OLD state for both: the position moves
    // with the old velocity, the velocity changes with the old acceleration. Semi-implicit Euler changes the velocity first and moves
    // the position with the NEW velocity: one line in a different order. Implicit Euler uses the force at the END of the step; for a
    // spring that solves in closed form for the new velocity.
    public class Step { public double x, v, a; }

    static Step ImplicitStep(double k, double m, double c, double h, double x, double v)
    {
        double vNew = (m * v - h * k * x) / (m + h * c + h * h * k);
        return new Step { x = x + h * vNew, v = vNew };
    }

    public static Step SpringStep(string kind, double k, double m, double c, double h, double x, double v)
    {
        double a = SpringForce(k, c, x, v) / m;   // acceleration of the old state, m/s^2
        double xNew = x;
        double vNew = v;
        if (kind == "explicit")
        {
            xNew = x + h * v;       // position from the old velocity
            vNew = v + h * a;       // velocity from the old acceleration
        }
        else if (kind == "semi")
        {
            vNew = v + h * a;       // velocity first
            xNew = x + h * vNew;    // then position, from the new velocity
        }
        else if (kind == "implicit")
        {
            Step step = ImplicitStep(k, m, c, h, x, v);
            xNew = step.x;
            vNew = step.v;
        }
        else
        {
            throw new ArgumentException("unknown integrator " + kind);
        }
        return new Step { x = xNew, v = vNew, a = a };
    }
    #endregion

    #region Verlet: positions only
    // Verlet keeps two positions and no velocity: the next position is twice this one, minus the last, plus a h^2. The velocity is
    // implied by the last two positions. Started from rest it makes the same positions as semi-implicit Euler, and a constraint can
    // move a position directly while the velocity follows.
    public class VerletResult { public double x, xPrev, v; }

    public static VerletResult VerletStep(double k, double m, double c, double h, double x, double xPrev)
    {
        double vOld = (x - xPrev) / h;
        double a = SpringForce(k, c, x, vOld) / m;
        double xNew = 2 * x - xPrev + a * h * h;
        double v = (xNew - x) / h;
        return new VerletResult { x = xNew, xPrev = x, v = v };
    }
    #endregion

    #region A run of steps
    // n steps from (x0, v0), recording the time, position, velocity and energy before each step and after the last. Verlet starts
    // from the previous position x0 - h v0, so that its first step is the same as semi-implicit Euler's.
    public class Run { public double[] times, xs, vs, energies; }

    public static Run RunSpring(string kind, double k, double m, double c, double h, double x0, double v0, int n)
    {
        double[] times = new double[n + 1];
        double[] xs = new double[n + 1];
        double[] vs = new double[n + 1];
        double[] energies = new double[n + 1];
        double x = x0;
        double v = v0;
        double xPrev = x0 - h * v0;
        for (int i = 0; i <= n; i++)
        {
            times[i] = i * h;
            xs[i] = x;
            vs[i] = v;
            energies[i] = EnergyOf(k, m, x, v);
            if (kind == "verlet")
            {
                VerletResult next = VerletStep(k, m, c, h, x, xPrev);
                xPrev = next.xPrev;
                x = next.x;
                v = next.v;
            }
            else
            {
                Step next = SpringStep(kind, k, m, c, h, x, v);
                x = next.x;
                v = next.v;
            }
        }
        return new Run { times = times, xs = xs, vs = vs, energies = energies };
    }
    #endregion

    #region The exact motion
    // The closed-form solution the steps approximate, for the spring with its damper: underdamped (zeta < 1) it rings at
    // omega sqrt(1 - zeta^2) and decays as exp(-zeta omega t); critically damped it is (x0 + (v0 + omega x0) t) exp(-omega t);
    // overdamped it is a sum of two decaying exponentials. Without a damper it is x0 cos(omega t) + (v0 / omega) sin(omega t).
    public class Motion { public double x, v; }

    public static Motion ExactSpring(double k, double m, double c, double x0, double v0, double t)
    {
        double omega = Math.Sqrt(k / m);
        double zeta = c / (2 * Math.Sqrt(k * m));
        double x = 0;
        double v = 0;
        if (Math.Abs(zeta - 1) < 1e-9)
        {
            double decay = Math.Exp(-omega * t);
            double b = v0 + omega * x0;
            x = (x0 + b * t) * decay;
            v = (b - omega * (x0 + b * t)) * decay;
        }
        else if (zeta < 1)
        {
            double rate = zeta * omega;
            double wd = omega * Math.Sqrt(1 - zeta * zeta);
            double decay = Math.Exp(-rate * t);
            double b = (v0 + rate * x0) / wd;
            double cs = Math.Cos(wd * t);
            double sn = Math.Sin(wd * t);
            x = decay * (x0 * cs + b * sn);
            v = decay * (-rate * (x0 * cs + b * sn) + wd * (-x0 * sn + b * cs));
        }
        else
        {
            double root = omega * Math.Sqrt(zeta * zeta - 1);
            double r1 = -zeta * omega + root;
            double r2 = -zeta * omega - root;
            double a1 = (v0 - r2 * x0) / (r1 - r2);
            double a2 = x0 - a1;
            x = a1 * Math.Exp(r1 * t) + a2 * Math.Exp(r2 * t);
            v = a1 * r1 * Math.Exp(r1 * t) + a2 * r2 * Math.Exp(r2 * t);
        }
        return new Motion { x = x, v = v };
    }
    #endregion

    #region The step as a matrix
    // Every step of the spring is linear, so one step is a 2 by 2 matrix on the state: (x, v), or (x, previous x) for Verlet. The
    // matrix is read off by stepping the two unit states. Its eigenvalues say what a step does to the motion: a complex pair is a
    // rotation scaled by sqrt(det), and a real pair is a decay or a growth along two directions.
    static double[] ApplyStep(string kind, double k, double m, double c, double h, double first, double second)
    {
        if (kind == "verlet")
        {
            VerletResult verlet = VerletStep(k, m, c, h, first, second);
            return new double[] { verlet.x, verlet.xPrev };
        }
        Step next = SpringStep(kind, k, m, c, h, first, second);
        return new double[] { next.x, next.v };
    }

    public static double[] StepMatrix(string kind, double k, double m, double c, double h)
    {
        double[] left = ApplyStep(kind, k, m, c, h, 1, 0);
        double[] right = ApplyStep(kind, k, m, c, h, 0, 1);
        return new double[] { left[0], right[0], left[1], right[1] };
    }

    public static double SpectralRadius(double a, double b, double c, double d)
    {
        double trace = a + d;
        double det = a * d - b * c;
        double disc = trace * trace / 4 - det;
        if (disc < 0) return Math.Sqrt(det);      // a complex pair: both have magnitude sqrt(det)
        double root = Math.Sqrt(disc);
        return Math.Max(Math.Abs(trace / 2 + root), Math.Abs(trace / 2 - root));
    }

    #endregion

    #region Stability: growth per step
    // The largest eigenvalue magnitude of the step matrix is the growth of the amplitude per step: above 1 the motion grows without
    // bound. For explicit Euler without a damper the energy is multiplied by 1 + (h omega)^2 every step; semi-implicit Euler and
    // Verlet stay bounded while h omega < 2; implicit Euler never grows.
    public class Stability { public double omega, hOmega, growth, energyFactor, limit; public bool bounded; public double damperFactor; }

    public static double GrowthPerStep(string kind, double k, double m, double c, double h)
    {
        double[] matrix = StepMatrix(kind, k, m, c, h);
        return SpectralRadius(matrix[0], matrix[1], matrix[2], matrix[3]);
    }

    // The largest h whose growth stays at 1 (within EPSILON): double h until it grows, then bisect. Infinity: it never grows.
    public static double StepLimit(string kind, double k, double m, double c)
    {
        double omega = Math.Sqrt(k / m);
        double high = 1 / omega;
        for (int i = 0; i < 40 && GrowthPerStep(kind, k, m, c, high) <= 1 + EPSILON; i++) high *= 2;
        if (GrowthPerStep(kind, k, m, c, high) <= 1 + EPSILON) return double.PositiveInfinity;
        double low = 0;
        for (int i = 0; i < 60; i++)
        {
            double mid = (low + high) / 2;
            if (GrowthPerStep(kind, k, m, c, mid) <= 1 + EPSILON) low = mid;
            else high = mid;
        }
        return low;
    }

    public static Stability StabilityReport(string kind, double k, double m, double c, double h)
    {
        double omega = Math.Sqrt(k / m);
        double hOmega = h * omega;
        double growth = GrowthPerStep(kind, k, m, c, h);
        double energyFactor = growth * growth;
        double limit = StepLimit(kind, k, m, c);
        bool bounded = growth <= 1 + EPSILON;
        double damperFactor = 1 - h * c / m;    // a damper stepped explicitly multiplies the velocity by this: |factor| < 1 needs h c / m < 2
        return new Stability { omega = omega, hOmega = hOmega, growth = growth, energyFactor = energyFactor, limit = limit, bounded = bounded, damperFactor = damperFactor };
    }
    #endregion

    #region The accumulator
    // Frames come in uneven lengths (milliseconds); the simulation steps by a fixed amount. Each frame adds its length to the
    // time carried over, runs every whole step that fits and carries the rest. The render alpha is the carry as a fraction of a
    // step: the picture is drawn that far between the last two states. A stalled frame is cut at clampMs, or it would demand
    // hundreds of steps.
    public class Accumulated { public double[] used, accumulated; public int[] steps; public double[] carried, alpha; public int totalSteps; public double wall, dropped; }

    public static double[] MakeFrames(int n, double baseMs, double jitter, long seed, int hitchAt, double hitchMs)
    {
        double[] frames = new double[n];
        long state = seed;
        for (int i = 0; i < n; i++)
        {
            RandomDraw draw = NextState(state);
            state = draw.state;
            frames[i] = baseMs * (1 + jitter * (2 * draw.u - 1));
        }
        if (hitchAt >= 0 && hitchAt < n && hitchMs > 0) frames[hitchAt] = hitchMs;
        return frames;
    }

    public static Accumulated Accumulate(double[] frames, double stepMs, double clampMs)
    {
        double[] used = new double[frames.Length];
        double[] accumulated = new double[frames.Length];
        int[] steps = new int[frames.Length];
        double[] carried = new double[frames.Length];
        double[] alpha = new double[frames.Length];
        double carry = 0;
        int totalSteps = 0;
        double wall = 0;
        double dropped = 0;
        for (int i = 0; i < frames.Length; i++)
        {
            double frame = Math.Min(frames[i], clampMs);    // a stalled frame is cut
            double left = carry + frame;
            int count = 0;
            while (left >= stepMs - EPSILON)
            {
                left -= stepMs;
                count++;
            }
            carry = Math.Max(0, left);
            used[i] = frame;
            accumulated[i] = carry + count * stepMs;
            steps[i] = count;
            carried[i] = carry;
            alpha[i] = carry / stepMs;
            totalSteps += count;
            wall += frames[i];
            dropped += frames[i] - frame;
        }
        return new Accumulated { used = used, accumulated = accumulated, steps = steps, carried = carried, alpha = alpha, totalSteps = totalSteps, wall = wall, dropped = dropped };
    }
    #endregion

    #region Two ways to step
    // The same spring over the same frames. 'frame': one step per frame, as long as the frame. 'substeps': the frame cut into
    // substeps equal steps. 'fixed': the accumulator, every step stepMs whatever the frames did. A step's length is the whole
    // difference: the first two take whatever the frame gives them (and a stalled frame is a long step), the third never changes.
    public class FrameRun { public double[] times, xs, vs, energies; public int stepsTaken; public double carry; }

    public static FrameRun SimulateFrames(string kind, string mode, double k, double m, double c, double[] frames, double stepMs, int substeps, double clampMs, double x0, double v0)
    {
        List<double> times = new List<double>();
        List<double> xs = new List<double>();
        List<double> vs = new List<double>();
        List<double> energies = new List<double>();
        times.Add(0);
        xs.Add(x0);
        vs.Add(v0);
        energies.Add(EnergyOf(k, m, x0, v0));
        double x = x0;
        double v = v0;
        double time = 0;
        double carry = 0;
        int stepsTaken = 0;
        for (int i = 0; i < frames.Length; i++)
        {
            double h = frames[i] / 1000;
            int count = 1;
            if (mode == "substeps")
            {
                h = frames[i] / 1000 / substeps;
                count = substeps;
            }
            else if (mode == "fixed")
            {
                double left = carry + Math.Min(frames[i], clampMs);
                count = 0;
                while (left >= stepMs - EPSILON)
                {
                    left -= stepMs;
                    count++;
                }
                carry = Math.Max(0, left);
                h = stepMs / 1000;
            }
            for (int j = 0; j < count; j++)
            {
                Step next = SpringStep(kind, k, m, c, h, x, v);
                x = next.x;
                v = next.v;
                time += h;
                stepsTaken++;
                times.Add(time);
                xs.Add(x);
                vs.Add(v);
                energies.Add(EnergyOf(k, m, x, v));
            }
        }
        return new FrameRun { times = times.ToArray(), xs = xs.ToArray(), vs = vs.ToArray(), energies = energies.ToArray(), stepsTaken = stepsTaken, carry = carry };
    }
    #endregion

    #region Contact: push out
    // A plane n . p = d with the unit normal n pointing out; the particle is inside when n . p < d, by depth = d - n . p. Push it
    // straight out along n. Then split the velocity into the part along n and the part along the surface: the normal part reverses
    // and is scaled by the restitution e (the share of the approach speed that comes back), and friction mu removes a share of the
    // tangential part, at most all of it, in proportion to the impulse the normal part received.
    public class Contact { public bool hit; public double depth; public double[] p, v; public double normalSpeed, tangentSpeed, speedBefore, speedAfter, kept; }

    public static Contact PlaneContact(double[] p, double[] v, double[] n, double d, double e, double mu)
    {
        double depth = d - (n[0] * p[0] + n[1] * p[1] + n[2] * p[2]);
        double speedBefore = Math.Sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (depth <= 0)
        {
            return new Contact { hit = false, depth = 0, p = (double[])p.Clone(), v = (double[])v.Clone(), normalSpeed = 0, tangentSpeed = 0, speedBefore = speedBefore, speedAfter = speedBefore, kept = 1 };
        }
        double[] pushed = new double[] { p[0] + n[0] * depth, p[1] + n[1] * depth, p[2] + n[2] * depth };
        double normalSpeed = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];    // negative: moving into the plane
        double[] tangent = new double[] { v[0] - n[0] * normalSpeed, v[1] - n[1] * normalSpeed, v[2] - n[2] * normalSpeed };
        double tangentSpeed = Math.Sqrt(tangent[0] * tangent[0] + tangent[1] * tangent[1] + tangent[2] * tangent[2]);
        double normalAfter = normalSpeed;
        double slide = 1;
        if (normalSpeed < 0)
        {
            normalAfter = -e * normalSpeed;
            if (tangentSpeed > 0) slide = Math.Max(0, 1 - mu * (1 + e) * (-normalSpeed) / tangentSpeed);
        }
        double[] after = new double[] { tangent[0] * slide + n[0] * normalAfter, tangent[1] * slide + n[1] * normalAfter, tangent[2] * slide + n[2] * normalAfter };
        double speedAfter = Math.Sqrt(after[0] * after[0] + after[1] * after[1] + after[2] * after[2]);
        double kept = speedBefore > 0 ? (speedAfter * speedAfter) / (speedBefore * speedBefore) : 1;
        return new Contact { hit = true, depth = depth, p = pushed, v = after, normalSpeed = normalSpeed, tangentSpeed = tangentSpeed, speedBefore = speedBefore, speedAfter = speedAfter, kept = kept };
    }
    #endregion

    #region A thin wall
    // A wall occupies wallMin < x < wallMax. A particle that ENDS a step inside it is put back on the face it came from (the side
    // its velocity says) and bounces with restitution e. One that starts a step before the wall and ends it past the wall was never
    // inside at any step, so nothing pushes it: it tunnels. ThrowRun is a particle thrown with velocity (vx0, vy0) under gravity g,
    // stepped semi-implicitly with steps of h, against the wall and the floor y = 0.
    public class Slab { public bool hit; public double x, vx; public bool crossed; }
    public class Throw { public double[] xs, ys, vxs, vys; public int wallStep, tunnelStep, floorStep; }

    public static Slab SlabContact(double x, double xPrev, double vx, double wallMin, double wallMax, double e)
    {
        bool inside = x > wallMin && x < wallMax;
        bool crossed = (xPrev <= wallMin && x >= wallMax) || (xPrev >= wallMax && x <= wallMin);
        if (!inside) return new Slab { hit = false, x = x, vx = vx, crossed = crossed };
        bool fromLeft = vx > 0;
        return new Slab { hit = true, x = fromLeft ? wallMin : wallMax, vx = -e * vx, crossed = false };
    }

    public static Throw ThrowRun(double x0, double y0, double vx0, double vy0, double g, double h, int steps, double wallMin, double wallMax, double e, double mu)
    {
        double[] xs = new double[steps + 1];
        double[] ys = new double[steps + 1];
        double[] vxs = new double[steps + 1];
        double[] vys = new double[steps + 1];
        xs[0] = x0;
        ys[0] = y0;
        vxs[0] = vx0;
        vys[0] = vy0;
        double x = x0;
        double y = y0;
        double vx = vx0;
        double vy = vy0;
        int wallStep = -1;
        int tunnelStep = -1;
        int floorStep = -1;
        for (int i = 1; i <= steps; i++)
        {
            double xPrev = x;
            vy = vy - g * h;
            x = x + h * vx;
            y = y + h * vy;
            Slab wall = SlabContact(x, xPrev, vx, wallMin, wallMax, e);
            if (wall.hit && wallStep < 0) wallStep = i;
            if (wall.crossed && tunnelStep < 0) tunnelStep = i;
            x = wall.x;
            vx = wall.vx;
            Contact floor = PlaneContact(new double[] { x, y, 0 }, new double[] { vx, vy, 0 }, new double[] { 0, 1, 0 }, 0, e, mu);
            if (floor.hit && floorStep < 0) floorStep = i;
            x = floor.p[0];
            y = floor.p[1];
            vx = floor.v[0];
            vy = floor.v[1];
            xs[i] = x;
            ys[i] = y;
            vxs[i] = vx;
            vys[i] = vy;
        }
        return new Throw { xs = xs, ys = ys, vxs = vxs, vys = vys, wallStep = wallStep, tunnelStep = tunnelStep, floorStep = floorStep };
    }
    #endregion
}
