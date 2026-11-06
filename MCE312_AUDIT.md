# FUTM-MCE 312 Signals and Systems: audit and build log

Source: Engr. Dr J. A. Bala. L01 Introduction to Signals and Systems (37 slides), L02 Sampling and Quantisation (12), L03 Fourier Transforms (25), CA test 2025/2026 (10 questions, 1 hour). 49 of the 74 slides carry their formulas as images; all were read from rendered pages.

## 1. Read-only audit (6 November 2026)

Recomputed with numpy: all four DFT/IDFT answers on L03 slides 17 to 25 are correct. The Fourier transform of the rectangular pulse (2 sin(wa)/w) and of the one-sided exponential (1/(a + jw)) are correct. The Fourier convention is F(w) = integral of f(t) e^(-jwt) dt, with j for the imaginary unit (the same sign convention as GET 301 lesson 3.2; GET 301 writes i).

Problems found (all taught corrected and flagged in the lessons):
1. L01 slide 5: "area under the unit step is unity" is wrong. The step has height 1 and infinite area; the impulse has area 1. (Lesson 1.2.)
2. L01 slide 11: the triangular pulse formula has base -T/2 to T/2, but the figure labels -T to T. (Lesson 1.2.)
3. L01 slide 6: the figure is the discrete delta[n], the text is the continuous delta(t). (Lesson 1.2.)
4. L01 slide 17: no power formula is given. (Lesson 1.4.)
5. L01 slide 18: x(t) = 3 + j4 is given as an example of a purely imaginary signal; its real part is 3. (Lesson 1.4.)
6. L01 slides 31 and 34: the examples y = 3x + 2 and y = 5x + 2 are time-invariant and static, but they are NOT linear (they fail homogeneity). To be taught in Module 2.
7. L02 slides 8 and 11 disagree on the level spacing: slide 8 divides the range by 2^W - 1 (2/7 for 3 bits over 0 to 2); slide 11 gives the resolution as 1/2^W (0.39 percent for 8 bits). To be taught in Module 3 with both conventions.
8. L02 slide 4: "less than fmax" and "exceeds" are followed by fs >= 2 fmax; the boundary case is unclear. (Module 3.)
9. L03 slide 15: 1/N is said to preserve energy; strictly it makes the inverse exact, and Parseval's relation carries the energy statement. (Module 3.)
10. Typos: L01 slide 5 "cular time"; L03 slide 3 "fT(t)fT(t)" and "period TT"; L02 slide 10 "times t = nTs".
11. CA test question 4 asks for six basic signals; the slides list seven (step, impulse, ramp, parabolic, sinusoidal, rectangular, triangular). Taught all seven.

Computed answers for the CA test: Q2 neither even nor odd (even part t^2, odd part sin t); Q8 30 kHz; Q9 16 levels; Q10 4/7 = 0.571 V (slide 8 method, 2^W - 1 intervals).

Gaps against a standard Signals and Systems course (added at the student's request, labelled "Not in your notes"): even/odd decomposition formulas, period calculations, system tests, LTI systems and convolution, Fourier series, properties of the Fourier transform, Laplace and Z transforms. Fourier series and Laplace overlap GET 301 Module 3; those lessons cross-refer to it.

## 2. Approved plan (24 lessons, built module by module)

M1 Signals (6): 1.1 what a signal is; 1.2 the seven basic signals; 1.3 even, odd and periodic; 1.4 energy, power, real and complex; 1.5 amplitude operations; 1.6 time operations.
M2 Systems (3): 2.1 systems and linearity; 2.2 time-invariance and LTI; 2.3 memory, causality, invertibility, stability.
M3 Sampling and the Fourier transform (4): 3.1 sampling, aliasing, Nyquist; 3.2 quantisation, ADC, DAC; 3.3 the Fourier transform; 3.4 the DFT and IDFT.
M4 LTI systems and convolution (3), M5 Fourier series and transform properties (3), M6 Laplace transform and transfer functions (3), M7 Z-transform (2): added at the student's request, to be proposed in detail before building.

## 3. Module 1 build (6 November 2026)

Built: 6 lessons, 23 worked examples, 48 practice problems, 24 multiple-choice, 42 theory questions, 30 flashcards, 39 glossary terms, 1 past-test item (Q2). Past-test Q8 to Q10 are loaded with Module 3. service worker `studyhub-2026-11-06-16`.
Tests: builder assertions (every answer recomputed with sympy, numpy or brute force); answer checker 49 cases, 0 failures; 574 maths segments rendered with KaTeX, 0 errors; 0 exclamation marks, 0 emoji; `node --check sw.js` passes. Not tested: the browser (the student tests on Vercel). No figures yet.
Files changed: data/mce312.json (new), data/courses.json (mce312 entry gets "file"), sw.js (version bump).

Open questions for the lecturer: u(0) convention; whether the triangular pulse has base T or 2T; whether the exam wants six or seven basic signals; which resolution convention for the ADC.
