using System;
using System.Collections.Generic;
using UnityEngine;

// OptimLab.cs: training a network is walking downhill on a loss surface. Loss surfaces, gradient
// descent, momentum and Adam (Kingma and Ba, 2015), minibatch gradients and their noise, a learning-rate schedule and weight
// decay.
// Plain C#, no MonoBehaviour: points are floats or float[]. OptimLabScene.cs draws a loss surface and the walk. No method changes its
// arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object optimlab.js
// returns. mono's compiler rejects tuples over 7 fields, so the three results with more are small structs declared below.
// The same functions, line for line where the languages allow, are optimlab.js in ../webgl/
// (lib/tests/programs/optim-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class OptimLab
{
    public struct AdamResult { public float[] m, v, mHat, vHat, step, next; public float c1, c2; }
    public struct RunResult { public float[] xs, ys, losses, gxs, gys; public int count; public bool diverged; public float[] vel, m, v; }
    public struct SgdResult { public float[] ws, bs, losses, etas; }

    #region Settings and random numbers
    // The defaults of Kingma and Ba for Adam. The random numbers are Park and Miller's integer generator (multiplier 48271,
    // modulus 2^31 - 1): the state is an integer, so both tracks draw the same minibatches.
    public const float Beta1 = 0.9f;
    public const float Beta2 = 0.999f;
    public const float Epsilon = 1e-8f;
    public const int Modulus = 2147483647;
    public const int Multiplier = 48271;
    public const float Limit = 1e6f;
    public const float TrueW = 1.2f;
    public const float TrueB = 0.5f;

    public static (int state, float u) NextState(int state)
    {
        int next = (int)(((long)state * Multiplier) % Modulus);
        float u = (float)((double)next / Modulus);
        return (next, u);
    }
    #endregion

    #region A quadratic bowl
    // L = (h1 u^2 + h2 v^2) / 2 in axes turned by an angle: u and v are the coordinates along the bowl's two principal axes.
    // Gradient descent multiplies each axis by 1 - eta h every step, so it converges when |1 - eta h| < 1 for both, that is
    // eta < 2 / h2 for the steeper axis. The best rate comes from eta = 2 / (h1 + h2).
    public static (float factor1, float factor2, float rate, float etaLimit, float etaBest) QuadraticRate(float h1, float h2, float eta)
    {
        float factor1 = 1f - eta * h1;
        float factor2 = 1f - eta * h2;
        float rate = Mathf.Max(Mathf.Abs(factor1), Mathf.Abs(factor2));
        float etaLimit = 2f / Mathf.Max(h1, h2);
        float etaBest = 2f / (h1 + h2);
        return (factor1, factor2, rate, etaLimit, etaBest);
    }

    public static (float loss, float gx, float gy) QuadraticLoss(float x, float y, float h1, float h2, float angle)
    {
        float c = Mathf.Cos(angle);
        float s = Mathf.Sin(angle);
        float u = c * x + s * y;
        float v = -s * x + c * y;
        float loss = 0.5f * (h1 * u * u + h2 * v * v);
        float gu = h1 * u;
        float gv = h2 * v;
        float gx = c * gu - s * gv;
        float gy = s * gu + c * gv;
        return (loss, gx, gy);
    }
    #endregion

    #region A saddle with two minima
    // L = x^2 / 2 + y^4 / 4 - y^2 / 2. The origin has zero gradient, but the surface curves up along x and down along y: a
    // saddle. Minima at (0, 1) and (0, -1), where L = -1/4. Started exactly on the x axis, descent never leaves it.
    public static (float loss, float gx, float gy) SaddleLoss(float x, float y)
    {
        float loss = 0.5f * x * x + 0.25f * y * y * y * y - 0.5f * y * y;
        float gx = x;
        float gy = y * y * y - y;
        return (loss, gx, gy);
    }
    #endregion

    #region A curved valley
    // L = ((1 - x)^2 + 5 (y - x^2)^2) / 10, a Rosenbrock-like valley (Rosenbrock, 1960): the floor follows the parabola
    // y = x^2 down to the minimum at (1, 1). The walls are steep and the floor is nearly flat, so a step that suits the walls
    // crawls along the floor.
    public static (float loss, float gx, float gy) ValleyLoss(float x, float y)
    {
        float rise = y - x * x;
        float loss = ((1f - x) * (1f - x) + 5f * rise * rise) / 10f;
        float gx = (-2f * (1f - x) - 20f * x * rise) / 10f;
        float gy = (10f * rise) / 10f;
        return (loss, gx, gy);
    }
    #endregion

    #region Several minima
    // L = 0.05 (x^2 + y^2) + 0.5 (2 - cos 2x - cos 2y). A bowl with a cosine ripple: minima near every multiple of pi, and the
    // start decides which one descent reaches. The lowest is the origin, where L = 0.
    public static (float loss, float gx, float gy) MinimaLoss(float x, float y)
    {
        float loss = 0.05f * (x * x + y * y) + 0.5f * (2f - Mathf.Cos(2f * x) - Mathf.Cos(2f * y));
        float gx = 0.1f * x + Mathf.Sin(2f * x);
        float gy = 0.1f * y + Mathf.Sin(2f * y);
        return (loss, gx, gy);
    }
    #endregion

    #region The perceptron's loss
    // The lecture's perceptron f(x) = b2 + w2 . tanh(w1 x + b1) on its one example (x = 0.4, y = 0.3), with every weight held at the
    // lecture's value except the first hidden unit's w1 (the horizontal axis) and w2 (the vertical axis). The slopes are measured,
    // not derived: nudge each weight by h both ways and divide the change in the loss by 2h (a central difference, error of order
    // h^2). The lecture's start, (1.0, 0.8), gives f = 0.6132 and the gradient (0.0976, 0.4487). The loss is computed in double
    // because a float cannot resolve a change this small; Unity's Mathf has no tanh, so the one from System is used.
    static double PerceptronValue(double w1, double w2)
    {
        double rest = 0.1 - 0.6 * Math.Tanh(-0.4 + 0.5);
        double a = Math.Tanh(0.4 * w1 + 0.5);
        double f = rest + w2 * a;
        double error = f - 0.3;
        return error * error;
    }

    public static (float loss, float gx, float gy) PerceptronLoss(float w1, float w2)
    {
        double h = 1e-5;
        double loss = PerceptronValue(w1, w2);
        double gx = (PerceptronValue(w1 + h, w2) - PerceptronValue(w1 - h, w2)) / (2 * h);
        double gy = (PerceptronValue(w1, w2 + h) - PerceptronValue(w1, w2 - h)) / (2 * h);
        return ((float)loss, (float)gx, (float)gy);
    }
    #endregion

    #region Choosing a surface
    // One name picks the surface; the second function measures its curvature by differencing the gradient. A stationary point is
    // a minimum when both curvatures (the eigenvalues of the matrix of second derivatives) are positive, and a saddle when
    // they differ in sign.
    public static (float loss, float gx, float gy) LossAt(string surface, float x, float y)
    {
        if (surface == "bowl") return QuadraticLoss(x, y, 1f, 4f, 0f);
        if (surface == "ill-conditioned") return QuadraticLoss(x, y, 0.5f, 10f, 0.5f);
        if (surface == "saddle") return SaddleLoss(x, y);
        if (surface == "valley") return ValleyLoss(x, y);
        if (surface == "minima") return MinimaLoss(x, y);
        return PerceptronLoss(x, y);
    }

    public static (float hxx, float hxy, float hyy, float lambdaMin, float lambdaMax) CurvatureAt(string surface, float x, float y)
    {
        float h = 0.001f;
        var right = LossAt(surface, x + h, y);
        var left = LossAt(surface, x - h, y);
        var up = LossAt(surface, x, y + h);
        var down = LossAt(surface, x, y - h);
        float hxx = (right.gx - left.gx) / (2f * h);
        float hyy = (up.gy - down.gy) / (2f * h);
        float hxy = (up.gx - down.gx) / (2f * h);
        float mean = 0.5f * (hxx + hyy);
        float spread = Mathf.Sqrt(0.25f * (hxx - hyy) * (hxx - hyy) + hxy * hxy);
        float lambdaMin = mean - spread;
        float lambdaMax = mean + spread;
        return (hxx, hxy, hyy, lambdaMin, lambdaMax);
    }
    #endregion

    #region Gradient descent step
    // theta <- theta - eta grad L. The gradient points uphill; the step is its negative scaled by the learning rate eta.
    public static (float[] step, float[] next) DescentStep(float[] theta, float[] grad, float eta)
    {
        float[] step = new float[theta.Length];
        float[] next = new float[theta.Length];
        for (int i = 0; i < theta.Length; i++)
        {
            step[i] = -eta * grad[i];
            next[i] = theta[i] + step[i];
        }
        return (step, next);
    }
    #endregion

    #region Momentum step
    // v <- beta v + g, then theta <- theta - eta v. Gradients that agree from step to step add up in v, gradients that alternate
    // cancel. With a steady gradient g the velocity grows toward g / (1 - beta), so the steps become 1 / (1 - beta) times longer.
    public static (float[] v, float[] step, float[] next) MomentumStep(float[] theta, float[] vPrev, float[] grad, float eta, float beta)
    {
        float[] v = new float[theta.Length];
        float[] step = new float[theta.Length];
        float[] next = new float[theta.Length];
        for (int i = 0; i < theta.Length; i++)
        {
            v[i] = beta * vPrev[i] + grad[i];
            step[i] = -eta * v[i];
            next[i] = theta[i] + step[i];
        }
        return (v, step, next);
    }
    #endregion

    #region Adam step
    // Adam (Kingma and Ba, 2015) keeps a running average m of the gradient and v of its square, one pair per weight. Both start at
    // zero, so the first averages are too small; dividing by 1 - beta^t corrects that (m hat, v hat). The step is eta m hat
    // over the root of v hat: at t = 1 it is eta times the sign of the gradient, whatever the gradient's size.
    public static AdamResult AdamStep(float[] theta, float[] mPrev, float[] vPrev, float[] grad, int t, float eta, float beta1, float beta2, float eps)
    {
        float c1 = 1f - Mathf.Pow(beta1, t);
        float c2 = 1f - Mathf.Pow(beta2, t);
        float[] m = new float[theta.Length];
        float[] v = new float[theta.Length];
        float[] mHat = new float[theta.Length];
        float[] vHat = new float[theta.Length];
        float[] step = new float[theta.Length];
        float[] next = new float[theta.Length];
        for (int i = 0; i < theta.Length; i++)
        {
            m[i] = beta1 * mPrev[i] + (1f - beta1) * grad[i];
            v[i] = beta2 * vPrev[i] + (1f - beta2) * grad[i] * grad[i];
            mHat[i] = m[i] / c1;
            vHat[i] = v[i] / c2;
            step[i] = -eta * mHat[i] / (Mathf.Sqrt(vHat[i]) + eps);
            next[i] = theta[i] + step[i];
        }
        AdamResult result = new AdamResult();
        result.m = m; result.v = v; result.mHat = mHat; result.vHat = vHat; result.step = step; result.next = next;
        result.c1 = c1; result.c2 = c2;
        return result;
    }
    #endregion

    #region Running an optimizer
    // Repeat: measure the loss and gradient at theta, take one step. kind is "gd", "momentum" or "adam". The run stops early
    // when the loss passes Limit or is not a number (diverged). vel, m and v are the optimizer's state after the last step.
    public static RunResult RunOptimizer(string surface, string kind, float[] start, float eta, float beta, int steps)
    {
        List<float> xs = new List<float>();
        List<float> ys = new List<float>();
        List<float> losses = new List<float>();
        List<float> gxs = new List<float>();
        List<float> gys = new List<float>();
        float[] theta = { start[0], start[1] };
        float[] vel = { 0f, 0f };
        float[] m = { 0f, 0f };
        float[] v = { 0f, 0f };
        bool diverged = false;
        for (int t = 0; t <= steps; t++)
        {
            var here = LossAt(surface, theta[0], theta[1]);
            if (!(Mathf.Abs(here.loss) < Limit))
            {
                diverged = true;
                break;
            }
            xs.Add(theta[0]);
            ys.Add(theta[1]);
            losses.Add(here.loss);
            gxs.Add(here.gx);
            gys.Add(here.gy);
            if (t == steps) break;
            float[] grad = { here.gx, here.gy };
            if (kind == "momentum")
            {
                var moved = MomentumStep(theta, vel, grad, eta, beta);
                vel = moved.v;
                theta = moved.next;
            }
            else if (kind == "adam")
            {
                var moved = AdamStep(theta, m, v, grad, t + 1, eta, Beta1, Beta2, Epsilon);
                m = moved.m;
                v = moved.v;
                theta = moved.next;
            }
            else
            {
                theta = DescentStep(theta, grad, eta).next;
            }
        }
        RunResult result = new RunResult();
        result.xs = xs.ToArray(); result.ys = ys.ToArray(); result.losses = losses.ToArray();
        result.gxs = gxs.ToArray(); result.gys = gys.ToArray();
        result.count = xs.Count; result.diverged = diverged;
        result.vel = vel; result.m = m; result.v = v;
        return result;
    }
    #endregion

    #region A small regression
    // Line fitting on n points: y = 1.2 x + 0.5 plus noise drawn uniformly from [-0.8, 0.8]. The loss over (w, b) is a quadratic
    // bowl, so the whole surface can be drawn and every gradient checked. x runs from 0 to 2, which tilts the bowl.
    public static (float[] xs, float[] ys) MakeRegression(int n, int seed)
    {
        float[] xs = new float[n];
        float[] ys = new float[n];
        int state = seed;
        for (int i = 0; i < n; i++)
        {
            var first = NextState(state);
            var second = NextState(first.state);
            state = second.state;
            float x = 2f * first.u;
            xs[i] = x;
            ys[i] = TrueW * x + TrueB + 1.6f * (second.u - 0.5f);
        }
        return (xs, ys);
    }
    #endregion

    #region A minibatch gradient
    // The loss is the mean of (w x + b - y)^2 over the examples named in indices. All n indices give the true gradient; a random
    // minibatch of them (drawn with replacement, by the integer generator) gives an unbiased estimate of it.
    public static int[] AllIndices(int n)
    {
        int[] indices = new int[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        return indices;
    }

    public static (int[] indices, int state) MinibatchIndices(int state, int n, int size)
    {
        int[] indices = new int[size];
        int next = state;
        for (int i = 0; i < size; i++)
        {
            next = NextState(next).state;
            indices[i] = next % n;
        }
        return (indices, next);
    }

    public static (float loss, float gw, float gb) RegressionGradient(float w, float b, float[] xs, float[] ys, int[] indices)
    {
        float sumLoss = 0f;
        float sumW = 0f;
        float sumB = 0f;
        for (int k = 0; k < indices.Length; k++)
        {
            int i = indices[k];
            float error = w * xs[i] + b - ys[i];
            sumLoss += error * error;
            sumW += 2f * error * xs[i];
            sumB += 2f * error;
        }
        float loss = sumLoss / indices.Length;
        float gw = sumW / indices.Length;
        float gb = sumB / indices.Length;
        return (loss, gw, gb);
    }
    #endregion

    #region Noise against batch size
    // Draw many minibatches of one size and measure how far each gradient lies from the true one (root mean square of the error
    // vector). The error of a mean of size independent draws falls as 1 / sqrt(size).
    public static (float rms, float fullW, float fullB, int state) GradientNoise(float w, float b, float[] xs, float[] ys, int size, int draws, int seed)
    {
        var full = RegressionGradient(w, b, xs, ys, AllIndices(xs.Length));
        int state = seed;
        float sum = 0f;
        for (int d = 0; d < draws; d++)
        {
            var batch = MinibatchIndices(state, xs.Length, size);
            state = batch.state;
            var g = RegressionGradient(w, b, xs, ys, batch.indices);
            float dw = g.gw - full.gw;
            float db = g.gb - full.gb;
            sum += dw * dw + db * db;
        }
        float rms = Mathf.Sqrt(sum / draws);
        return (rms, full.gw, full.gb, state);
    }

    // How many steps make one pass over the data (an epoch), and how many epochs a run of steps amounts to.
    public static (int perEpoch, float epochs) EpochsOf(int examples, int size, int steps)
    {
        int perEpoch = Mathf.CeilToInt((float)examples / size);
        float epochs = ((float)steps * size) / examples;
        return (perEpoch, epochs);
    }
    #endregion

    #region A learning-rate schedule
    // Warmup raises eta linearly from 0 over the first warmup steps; cosine decay then takes it from eta0 to 0 at step total:
    // eta = eta0 (1 + cos(pi progress)) / 2. Weight decay adds lambda theta to the gradient, which shrinks every weight a little
    // each step; a weight with no gradient is multiplied by 1 - eta lambda per step.
    public static (float ramp, float progress, float cosine, float eta) ScheduleRate(int t, int total, float eta0, int warmup)
    {
        float ramp = warmup > 0 ? Mathf.Min(1f, (float)t / warmup) : 1f;
        int span = Mathf.Max(1, total - warmup);
        float progress = Mathf.Min(1f, Mathf.Max(0f, (float)(t - warmup) / span));
        float cosine = 0.5f * (1f + Mathf.Cos(Mathf.PI * progress));
        float eta = eta0 * ramp * cosine;
        return (ramp, progress, cosine, eta);
    }

    public static (float[] step, float[] next) DecayStep(float[] theta, float[] grad, float eta, float lambda)
    {
        float[] step = new float[theta.Length];
        float[] next = new float[theta.Length];
        for (int i = 0; i < theta.Length; i++)
        {
            step[i] = -eta * (grad[i] + lambda * theta[i]);
            next[i] = theta[i] + step[i];
        }
        return (step, next);
    }

    public static (float w, float factor) WeightDecayRun(float w0, float eta, float lambda, int steps)
    {
        float[] theta = { w0 };
        for (int t = 0; t < steps; t++) theta = DecayStep(theta, new float[] { 0f }, eta, lambda).next;
        float w = theta[0];
        float factor = w / w0;
        return (w, factor);
    }
    #endregion

    #region Stochastic descent
    // Minibatch gradient descent on the regression: each step draws size examples (size 0 uses all of them), takes their gradient,
    // and moves by the scheduled eta (or by eta0 when cosine is false). losses is the loss over all the data after each step.
    public static SgdResult RunSgd(float[] xs, float[] ys, float[] start, int size, float eta0, int steps, int warmup, bool cosine, int seed)
    {
        int[] all = AllIndices(xs.Length);
        List<float> ws = new List<float>();
        List<float> bs = new List<float>();
        List<float> losses = new List<float>();
        List<float> etas = new List<float>();
        float[] theta = { start[0], start[1] };
        int state = seed;
        for (int t = 0; t <= steps; t++)
        {
            ws.Add(theta[0]);
            bs.Add(theta[1]);
            losses.Add(RegressionGradient(theta[0], theta[1], xs, ys, all).loss);
            if (t == steps) break;
            int[] indices = all;
            if (size > 0)
            {
                var batch = MinibatchIndices(state, xs.Length, size);
                state = batch.state;
                indices = batch.indices;
            }
            var g = RegressionGradient(theta[0], theta[1], xs, ys, indices);
            float eta = cosine ? ScheduleRate(t, steps, eta0, warmup).eta : eta0;
            etas.Add(eta);
            theta = DescentStep(theta, new float[] { g.gw, g.gb }, eta).next;
        }
        SgdResult result = new SgdResult();
        result.ws = ws.ToArray(); result.bs = bs.ToArray(); result.losses = losses.ToArray(); result.etas = etas.ToArray();
        return result;
    }
    #endregion

    #region A one-unit network
    // One unit with a sine activation, f(x) = sin(w x + b), fit to n points of the wave sin(2.5 x + 0.3) plus noise drawn uniformly
    // from [-0.3, 0.3], with x from -1.5 to 1.5. The loss over (w, b) is not a bowl: a slow wave near w = 0.5 is a minimum, and a
    // worse one than the right wave near w = 2.5. The slopes are the chain rule: the derivative of (sin z - y)^2 with z = w x + b is
    // 2 (sin z - y) cos z, times x for w and times 1 for b.
    public const float WaveW = 2.5f;
    public const float WaveB = 0.3f;

    public static (float[] xs, float[] ys) MakeWave(int n, int seed)
    {
        float[] xs = new float[n];
        float[] ys = new float[n];
        int state = seed;
        for (int i = 0; i < n; i++)
        {
            var first = NextState(state);
            var second = NextState(first.state);
            state = second.state;
            float x = 3f * first.u - 1.5f;
            xs[i] = x;
            ys[i] = Mathf.Sin(WaveW * x + WaveB) + 0.6f * (second.u - 0.5f);
        }
        return (xs, ys);
    }

    public static (float loss, float gw, float gb) WaveGradient(float w, float b, float[] xs, float[] ys, int[] indices)
    {
        float sumLoss = 0f;
        float sumW = 0f;
        float sumB = 0f;
        for (int k = 0; k < indices.Length; k++)
        {
            int i = indices[k];
            float z = w * xs[i] + b;
            float error = Mathf.Sin(z) - ys[i];
            float slope = 2f * error * Mathf.Cos(z);
            sumLoss += error * error;
            sumW += slope * xs[i];
            sumB += slope;
        }
        float loss = sumLoss / indices.Length;
        float gw = sumW / indices.Length;
        float gb = sumB / indices.Length;
        return (loss, gw, gb);
    }
    #endregion

    #region Escaping a minimum
    // Stochastic descent on the one-unit network, eta decaying from eta0 to 0 by the cosine schedule. Each step draws size examples
    // (size 0 uses all of them), so each step goes downhill on a different surface: the loss of that batch. Those surfaces average to
    // the loss over all the data, which losses records after each step. The noise can carry the weights over a ridge that the full
    // gradient never crosses; EscapeCount repeats a run with runs different seeds and counts the runs that end with a loss below good.
    public static SgdResult RunWave(float[] xs, float[] ys, float[] start, int size, float eta0, int steps, int seed)
    {
        int[] all = AllIndices(xs.Length);
        List<float> ws = new List<float>();
        List<float> bs = new List<float>();
        List<float> losses = new List<float>();
        List<float> etas = new List<float>();
        float[] theta = { start[0], start[1] };
        int state = seed;
        for (int t = 0; t <= steps; t++)
        {
            ws.Add(theta[0]);
            bs.Add(theta[1]);
            losses.Add(WaveGradient(theta[0], theta[1], xs, ys, all).loss);
            if (t == steps) break;
            int[] indices = all;
            if (size > 0)
            {
                var batch = MinibatchIndices(state, xs.Length, size);
                state = batch.state;
                indices = batch.indices;
            }
            var g = WaveGradient(theta[0], theta[1], xs, ys, indices);
            float eta = ScheduleRate(t, steps, eta0, 0).eta;
            etas.Add(eta);
            theta = DescentStep(theta, new float[] { g.gw, g.gb }, eta).next;
        }
        SgdResult result = new SgdResult();
        result.ws = ws.ToArray(); result.bs = bs.ToArray(); result.losses = losses.ToArray(); result.etas = etas.ToArray();
        return result;
    }

    public static int RunSeed(int run)
    {
        return 1000 + 7919 * run;
    }

    public static (int escaped, int runs) EscapeCount(float[] xs, float[] ys, float[] start, int size, float eta0, int steps, int runs, float good)
    {
        int escaped = 0;
        for (int r = 0; r < runs; r++)
        {
            SgdResult result = RunWave(xs, ys, start, size, eta0, steps, RunSeed(r));
            if (result.losses[steps] < good) escaped++;
        }
        return (escaped, runs);
    }
    #endregion
}
