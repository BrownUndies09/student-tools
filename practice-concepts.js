/* ===== Practice Mode · Concept Adapters =====
 *
 * Each concept defines how problems are generated, solved, validated,
 * and how common mistakes are detected.
 *
 * TWO types of concept:
 *   - numeric:     inputs are numbers, answers are numbers, steps are calculations
 *   - conceptual:  inputs are a chosen sub-topic, answers are multiple choice
 *
 * The engine reads this file and calls the functions per concept.
 * Add new concepts by adding a new object to PRACTICE_CONCEPTS.
 */

const PRACTICE_CONCEPTS = {

  /* ============================================================
     CONCEPT 1: COULOMB'S LAW (numeric)
     Grade 11 Physics
     ============================================================ */
  coulomb: {
    id: 'coulomb',
    title: "Coulomb's Law",
    subject: 'Physics',
    grade: 11,
    type: 'numeric',
    icon: '⚡',
    description: 'Calculate the electrostatic force between two point charges.',

    /* ---------- Problem generation ---------- */
    // Returns a fresh problem every call.
    generate(tier) {
      // Different difficulty tiers use different value ranges
      const ranges = {
        1: {
          q1: [1, 9],           // whole coulombs
          q2: [1, 9],
          r:  [1, 5]            // whole metres
        },
        2: {
          q1: [1e-6, 9e-6],     // microcoulombs
          q2: [1e-6, 9e-6],
          r:  [0.1, 2]
        },
        3: {
          q1: [1e-9, 9e-9],     // nanocoulombs
          q2: [1e-9, 9e-9],
          r:  [0.01, 0.5]
        }
      };
      const range = ranges[tier] || ranges[1];

      // Pick nice round-ish numbers for tier 1, random for tiers 2-3
      const rand = (min, max) => min + Math.random() * (max - min);
      const nice = (min, max) => {
        const candidates = [];
        for (let v = min; v <= max; v *= 10) {
          candidates.push(v, v * 2, v * 3, v * 4, v * 5, v * 6, v * 7, v * 8, v * 9);
        }
        const filtered = candidates.filter(v => v >= min && v <= max);
        return filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : rand(min, max);
      };

      let q1, q2, r;
      if (tier === 1) {
        q1 = Math.floor(rand(range.q1[0], range.q1[1])) + 1;
        q2 = Math.floor(rand(range.q2[0], range.q2[1])) + 1;
        r = Math.floor(rand(range.r[0], range.r[1])) + 1;
      } else {
        q1 = nice(range.q1[0], range.q1[1]);
        q2 = nice(range.q2[0], range.q2[1]);
        r = nice(range.r[0], range.r[1]);
      }

      return { q1, q2, r, tier };
    },

    /* ---------- Solve ---------- */
    // Given problem inputs, return the reference answer + working steps.
    solve(inputs) {
      const k = 9e9;
      const { q1, q2, r } = inputs;
      const rSquared = r * r;
      const numerator = k * Math.abs(q1) * Math.abs(q2);
      const answer = numerator / rSquared;
      const attractive = (q1 * q2) < 0;

      const steps = [
        {
          label: 'Formula',
          value: 'F = k·|Q₁·Q₂| / r²',
          unit: ''
        },
        {
          label: 'Substitute',
          value: `F = (9×10⁹)·(${this.fmt(q1)})·(${this.fmt(q2)}) / (${this.fmt(r)})²`,
          unit: ''
        },
        {
          label: 'Denominator',
          value: `r² = (${this.fmt(r)})² = ${this.fmt(rSquared)}`,
          unit: 'm²'
        },
        {
          label: 'Divide',
          value: `F = ${this.fmt(numerator)} / ${this.fmt(rSquared)} = ${this.fmt(answer)}`,
          unit: 'N'
        }
      ];

      return {
        answer: answer,
        answerFormatted: `${this.fmt(answer)} N`,
        steps: steps,
        meta: {
          attractive: attractive,
          direction: attractive ? 'attractive (opposite charges)' : 'repulsive (like charges)'
        }
      };
    },

    /* ---------- Step validation ---------- */
    // Used in Practice Mode. Student enters each step separately.
    // Returns true/false for each step.
    checkStep(inputs, stepIndex, studentAnswer) {
      const reference = this.solve(inputs);
      const tolerance = 0.01; // 1% tolerance for numeric answers
      const expected = reference.steps[stepIndex];
      if (!expected) return { correct: false, expected: null };
      // For the formula step, only check the final numeric step, not the symbolic one
      if (stepIndex === 0 || stepIndex === 1) {
        return { correct: true, expected: null };
      }
      const expectedNum = this.extractNumber(expected.value);
      const studentNum = parseFloat(String(studentAnswer).replace(/[^0-9.\-eE]/g, ''));
      if (isNaN(studentNum) || expectedNum === null) {
        return { correct: false, expected: expectedNum };
      }
      const diff = Math.abs(studentNum - expectedNum);
      const relDiff = expectedNum !== 0 ? diff / Math.abs(expectedNum) : diff;
      return {
        correct: relDiff < tolerance,
        expected: expectedNum
      };
    },

    /* ---------- Error pattern detection ---------- */
    // Called when student gets a wrong answer.
    // Returns a pattern id + explanation, or null.
    detectError(inputs, studentAnswer) {
      const reference = this.solve(inputs);
      const correct = reference.answer;
      const student = parseFloat(String(studentAnswer).replace(/[^0-9.\-eE]/g, ''));
      if (isNaN(student)) return null;

      const { q1, q2, r } = inputs;
      const k = 9e9;

      // Pattern 1: Forgot to square r
      // If they divided by r instead of r², answer = correct * r
      const forgotSquare = k * Math.abs(q1) * Math.abs(q2) / r;
      if (this.relativeClose(student, forgotSquare, 0.05)) {
        return {
          id: 'forgot_to_square_r',
          title: 'You forgot to square r',
          explain: 'The formula requires r SQUARED (r²), not just r. Always square the distance before dividing.',
          walkthrough: `You used r = ${this.fmt(r)} in the denominator. The formula needs r² = ${this.fmt(r * r)}.`,
          fix: 'Write r² explicitly in step 2 of your working to avoid this mistake.'
        };
      }

      // Pattern 2: Power of ten error
      // Student answer is off by a power of 10
      const ratio = student / correct;
      if (Math.abs(ratio - 10) < 1 || Math.abs(ratio - 0.1) < 0.1 || Math.abs(ratio - 100) < 10 || Math.abs(ratio - 0.01) < 0.01) {
        return {
          id: 'wrong_power_of_ten',
          title: 'Power of ten is off',
          explain: 'Your answer is off by a power of ten. This usually happens when multiplying or dividing scientific notation.',
          walkthrough: `You got ${this.fmt(student)} but expected ${this.fmt(correct)}. Check the exponents in your multiplication.`,
          fix: 'Separate the numbers from the powers of ten. Multiply numbers, add exponents, then recombine.'
        };
      }

      // Pattern 3: Sign error on charges
      // Should have absolute value
      const signError = -k * (q1 * q2) / (r * r);
      if (this.relativeClose(student, signError, 0.05) && signError !== correct) {
        return {
          id: 'negative_force',
          title: 'Force cannot be negative',
          explain: 'Force magnitude is always positive. Use absolute value of the charges.',
          walkthrough: `You wrote the force as negative. The correct magnitude is ${this.fmt(Math.abs(correct))} N.`,
          fix: 'Write |Q₁·Q₂| in the numerator. The magnitude is always positive.'
        };
      }

      // Pattern 4: Inverted formula (multiplied instead of divided)
      const inverted = k * Math.abs(q1) * Math.abs(q2) * (r * r);
      if (this.relativeClose(student, inverted, 0.05)) {
        return {
          id: 'multiplied_by_r',
          title: 'Multiplied instead of divided by r²',
          explain: 'You should divide by r², not multiply.',
          walkthrough: `Multiplying gives ${this.fmt(inverted)}. The correct operation is division.`,
          fix: 'Remember: F ∝ 1/r². The further apart the charges, the weaker the force.'
        };
      }

      return {
        id: 'unknown',
        title: 'Answer is not correct',
        explain: `Expected ${this.fmt(correct)} N.`,
        walkthrough: 'Review your working step by step.',
        fix: 'Check each step carefully.'
      };
    },

    /* ---------- Focused practice drills ---------- */
    // Given an error pattern id, generate problems that isolate that mistake.
    drill(errorId) {
      if (errorId === 'forgot_to_square_r') {
        // Problems where r > 1 and squaring matters a lot
        const r = Math.floor(Math.random() * 4) + 2; // 2-5
        const q1 = Math.floor(Math.random() * 4) + 1;
        const q2 = Math.floor(Math.random() * 4) + 1;
        return {
          type: 'coulomb',
          inputs: { q1, q2, r, tier: 1 },
          focusStep: 'denominator',
          focusPrompt: `This time, explicitly compute r² = (${r})² before moving on.`
        };
      }
      if (errorId === 'wrong_power_of_ten') {
        // Problems with clean scientific notation
        const q1 = (Math.floor(Math.random() * 5) + 1) * 1e-6;
        const q2 = (Math.floor(Math.random() * 5) + 1) * 1e-6;
        const r = Math.floor(Math.random() * 3) + 1;
        return {
          type: 'coulomb',
          inputs: { q1, q2, r, tier: 2 },
          focusStep: 'numerator',
          focusPrompt: 'Multiply the coefficients separately from the powers of ten.'
        };
      }
      // Default: normal problem
      return {
        type: 'coulomb',
        inputs: this.generate(1),
        focusStep: null,
        focusPrompt: 'Work through this carefully, step by step.'
      };
    },

    /* ---------- Formatting helper ---------- */
    fmt(n) {
      if (n === 0) return '0';
      const abs = Math.abs(n);
      if (abs < 0.001 || abs >= 10000) {
        // Scientific notation
        const exp = Math.floor(Math.log10(abs));
        const mantissa = n / Math.pow(10, exp);
        const mantFixed = Math.abs(mantissa - Math.round(mantissa)) < 0.01
          ? Math.round(mantissa).toString()
          : mantissa.toFixed(2);
        return `${mantFixed}×10^${exp}`;
      }
      if (Number.isInteger(n)) return n.toString();
      return parseFloat(n.toFixed(4)).toString();
    },

    extractNumber(str) {
      const match = String(str).match(/(-?\d+\.?\d*(?:[eE][+\-]?\d+)?)\s*$/);
      if (!match) return null;
      return parseFloat(match[1]);
    },

    relativeClose(a, b, tol) {
      if (b === 0) return Math.abs(a) < tol;
      return Math.abs(a - b) / Math.abs(b) < tol;
    }
  },

  /* ============================================================
     CONCEPT 2: VOLCANO TYPES (conceptual)
     Grade 10 Geography
     ============================================================ */
  volcano_type: {
    id: 'volcano_type',
    title: 'Volcano Types',
    subject: 'Geography',
    grade: 10,
    type: 'conceptual',
    icon: '🌋',
    description: 'Identify volcano types from their features and behaviour.',

    /* ---------- Underlying data ---------- */
    data: {
      shield: {
        name: 'Shield volcano',
        features: [
          'broad, gently sloping sides formed by runny lava',
          'non-explosive eruptions with lava that flows far',
          'a wide, dome-shaped profile built by repeated lava flows'
        ],
        examples: ['Mauna Loa (Hawaii)']
      },
      composite: {
        name: 'Composite volcano',
        features: [
          'steep, conical sides with alternating layers of lava and ash',
          'explosive eruptions with pyroclastic flows',
          'a classic mountain shape with a narrow base and steep sides'
        ],
        examples: ['Mount Fuji (Japan)', 'Mount Etna (Italy)']
      },
      cinder: {
        name: 'Cinder cone',
        features: [
          'a small, steep cone that ejects ash and cinders',
          'short-lived, explosive eruptions',
          'a cone built from fragments of rock and ash'
        ],
        examples: ['Paricutin (Mexico)', 'Sunset Crater (USA)']
      }
    },

    /* ---------- Problem generation ---------- */
    generate(tier) {
      const keys = Object.keys(this.data);
      const correctKey = keys[Math.floor(Math.random() * keys.length)];
      const correctEntry = this.data[correctKey];

      // Pick a random feature of the correct concept
      const featureList = tier === 1
        ? correctEntry.features.slice(0, 1)     // tier 1: only the clearest feature
        : correctEntry.features;                 // tier 2+: all features
      const feature = featureList[Math.floor(Math.random() * featureList.length)];

      // Pick 3 wrong names as distractors
      const wrongKeys = keys.filter(k => k !== correctKey);
      this.shuffle(wrongKeys);
      const wrongNames = wrongKeys.slice(0, 3).map(k => this.data[k].name);

      // Build options array (correct + 3 wrong), shuffled
      const options = [correctEntry.name, ...wrongNames];
      this.shuffle(options);

      // Occasionally flip the question format (tier 2+)
      const useReverseFormat = tier >= 2 && Math.random() < 0.4;

      if (useReverseFormat) {
        // "What is a [type] characterised by?"
        const correctFeature = correctEntry.features[Math.floor(Math.random() * correctEntry.features.length)];
        const wrongFeatures = wrongKeys.slice(0, 3)
          .map(k => this.data[k].features[Math.floor(Math.random() * this.data[k].features.length)]);
        const revOptions = [correctFeature, ...wrongFeatures];
        this.shuffle(revOptions);
        return {
          question: `Which of the following describes a ${correctEntry.name.toLowerCase()}?`,
          options: revOptions,
          answer: correctFeature,
          correctKey: correctKey,
          tier
        };
      } else {
        return {
          question: `A volcano with ${feature} is called a:`,
          options: options,
          answer: correctEntry.name,
          correctKey: correctKey,
          tier
        };
      }
    },

    /* ---------- Answer check ---------- */
    checkAnswer(problem, studentAnswer) {
      return {
        correct: studentAnswer === problem.answer,
        expected: problem.answer
      };
    },

    /* ---------- Error pattern detection ---------- */
    detectError(problem, studentAnswer) {
      // Find which key the student picked
      let pickedKey = null;
      for (const k in this.data) {
        if (this.data[k].name === studentAnswer) { pickedKey = k; break; }
      }
      if (!pickedKey) {
        return {
          id: 'unknown',
          title: 'Answer not recognised',
          explain: `Expected ${problem.answer}.`,
          walkthrough: 'Review the definition.',
          fix: 'Read the description carefully and match keywords.'
        };
      }

      // Pattern: confusing shield with composite
      if (problem.correctKey === 'shield' && pickedKey === 'composite') {
        return {
          id: 'shield_vs_composite',
          title: 'Confused shield with composite',
          explain: 'Shield volcanoes are WIDE and gentle. Composite volcanoes are STEEP and explosive.',
          walkthrough: `A shield volcano has broad, gentle slopes. A composite has steep sides with layers.`,
          fix: 'Remember: SHIELD = SHALLOW slope. COMPOSITE = STEEP. Both start with S and C, but the shape is opposite.'
        };
      }

      // Pattern: confusing cinder with composite (both are explosive)
      if (problem.correctKey === 'cinder' && pickedKey === 'composite') {
        return {
          id: 'cinder_vs_composite',
          title: 'Confused cinder cone with composite',
          explain: 'Cinder cones are SMALL and short-lived. Composite volcanoes are LARGE and long-lived.',
          walkthrough: `Cinder cones eject ash and cinders. Composite volcanoes have layers of both lava and ash.`,
          fix: 'Cinder = small, single-purpose. Composite = large, layered.'
        };
      }

      // Pattern: confusing composite with shield
      if (problem.correctKey === 'composite' && pickedKey === 'shield') {
        return {
          id: 'composite_vs_shield',
          title: 'Confused composite with shield',
          explain: 'Composite volcanoes are STEEP. Shield volcanoes are WIDE and shallow.',
          walkthrough: `Composite volcanoes are explosive and have alternating lava/ash layers. Shield volcanoes have runny lava.`,
          fix: 'Explosive + steep = composite. Quiet + wide = shield.'
        };
      }

      // Generic wrong answer
      return {
        id: 'confused_types',
        title: 'Picked the wrong volcano type',
        explain: `The correct answer is ${problem.answer}.`,
        walkthrough: 'Match the key feature in the description to the volcano it describes.',
        fix: 'Re-read the feature: what shape does it produce? How does it erupt?'
      };
    },

    /* ---------- Focused practice drills ---------- */
    drill(errorId) {
      // Return a problem that isolates the confusion
      if (errorId === 'shield_vs_composite') {
        const shield = this.data.shield;
        const composite = this.data.composite;
        return {
          type: 'volcano_type',
          problem: {
            question: `A volcano has broad, gently sloping sides formed by runny lava. What type is it?`,
            options: this.shuffleCopy([shield.name, composite.name, this.data.cinder.name, 'Caldera']),
            answer: shield.name,
            correctKey: 'shield',
            tier: 1
          },
          focusPrompt: 'Focus on the words "broad, gently sloping" — these describe SHIELD volcanoes.'
        };
      }
      if (errorId === 'composite_vs_shield') {
        const shield = this.data.shield;
        const composite = this.data.composite;
        return {
          type: 'volcano_type',
          problem: {
            question: `A volcano has steep, conical sides with alternating layers of lava and ash. What type is it?`,
            options: this.shuffleCopy([shield.name, composite.name, this.data.cinder.name, 'Caldera']),
            answer: composite.name,
            correctKey: 'composite',
            tier: 1
          },
          focusPrompt: 'Focus on "steep" and "layers" — composite volcanoes are built from alternating layers.'
        };
      }
      if (errorId === 'cinder_vs_composite') {
        const cinder = this.data.cinder;
        const composite = this.data.composite;
        return {
          type: 'volcano_type',
          problem: {
            question: `A small, steep cone that ejects ash and cinders in short-lived explosive eruptions is a:`,
            options: this.shuffleCopy([composite.name, cinder.name, this.data.shield.name, 'Caldera']),
            answer: cinder.name,
            correctKey: 'cinder',
            tier: 1
          },
          focusPrompt: 'Focus on "small" and "short-lived" — cinder cones are the smallest volcano type.'
        };
      }
      // Default: normal problem
      return {
        type: 'volcano_type',
        problem: this.generate(1),
        focusPrompt: 'Read the feature carefully before choosing.'
      };
    },

    /* ---------- Helpers ---------- */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    shuffleCopy(arr) {
      return this.shuffle([...arr]);
    }
  }

};

/* Expose globally for the engine to use */
if (typeof window !== 'undefined') {
  window.PRACTICE_CONCEPTS = PRACTICE_CONCEPTS;
}