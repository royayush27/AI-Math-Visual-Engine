const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");

const inputIds = ["m00", "m01", "m10", "m11"];
const inputs = Object.fromEntries(inputIds.map((id) => [id, document.getElementById(id)]));
const input3Ids = ["m300", "m301", "m302", "m310", "m311", "m312", "m320", "m321", "m322"];
const inputs3 = Object.fromEntries(input3Ids.map((id) => [id, document.getElementById(id)]));
const sliders = [...document.querySelectorAll("[data-cell]")];
const toggles = {
  grid: document.querySelector("#showGrid"),
  square: document.querySelector("#showUnitSquare"),
  circle: document.querySelector("#showCircle"),
  basis: document.querySelector("#showBasis"),
  eigen: document.querySelector("#showEigen"),
  points: document.querySelector("#showPoints"),
};
const tabs = [...document.querySelectorAll("[data-mode]")];
const distributionSelect = document.querySelector("#distributionSelect");
const distributionParams = document.querySelector("#distributionParams");
const plotButtons = [...document.querySelectorAll("[data-plot]")];

const state = {
  target: [1, 0, 0, 1],
  target3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  dimension: 2,
  mix: 1,
  playing: false,
  activeMode: "transform",
  calculusMode: "oneD",
  plotMode: "density",
  lastTime: 0,
  scale: 64,
  pan: { x: 0, y: 0 },
  dragging: false,
  dragStart: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },
  distributionLayers: [],
  nextLayerId: 1,
  lastPlot: null,
  flowPhase: 0,
  lastFlowDraw: 0,
  showGradientFlow: true,
  flowDensity: 6,
  flowSpeed: 0.35,
  gradientReach: 0.09,
  surfaceOrbit: { yaw: -Math.PI / 4, pitch: 0.78, roll: 0 },
};

const colors = {
  axis: "#8fa0b5",
  grid: "rgba(146, 166, 190, 0.32)",
  original: "#778596",
  transformed: "#ff6b61",
  i: "#56a7ff",
  j: "#48e0a4",
  eigen: "#ffc45d",
  probe: "#a98bff",
  svd: "#39d7ff",
  k: "#ffc45d",
  panel: "#080c14",
};

const derivedCombineModes = new Set(["variableSum", "variableProduct", "variableRatio", "fRatio"]);
const basisLabels = {
  i: "î",
  j: "ĵ",
  k: "k\u0302",
};

const samplePoints = [
  [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
  [-2, 0], [-1, 0], [1, 0], [2, 0],
  [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
  [-1.5, 1.7], [1.4, -1.6], [0.6, 2.1], [-0.7, -2.2],
];

const presets = {
  rotation: rotationMatrix(Math.PI / 6),
  reflection: [1, 0, 0, -1],
  shear: [1, 1.1, 0.35, 1],
  scale: [1.7, 0, 0, 0.55],
  projection: [1, 0, 0, 0],
  singular: [1.1, -0.55, -0.8, 0.4],
  spiral: [0.82, -0.72, 0.72, 0.82],
  swap: [0, 1, 1, 0],
};

const presets3 = {
  rotateZ: [0.866, -0.5, 0, 0.5, 0.866, 0, 0, 0, 1],
  tilt: [1, 0, 0.35, 0, 1, -0.25, 0.2, 0.15, 1],
  scale3: [1.55, 0, 0, 0, 0.72, 0, 0, 0, 1.22],
  shear3: [1, 0.45, 0.15, 0.2, 1, 0.35, 0.1, -0.25, 1],
};

const calculusPresets = {
  "x^2": "x^2",
  "sin(x)": "sin(x)",
  "cos(x)": "cos(x)",
  "exp(x/3)": "exp(x/3)",
  "ln(x+4)": "ln(x+4)",
  "1/(1+x^2)": "1/(1+x^2)",
  sigmoid: "sigmoid",
  tanh: "tanh",
  relu: "relu",
  softplus: "softplus",
  gaussian: "gaussian",
  "x^2+y^2": "x^2 + y^2",
  "sin(x)*cos(y)": "sin(x)*cos(y)",
  "exp(-(x^2+y^2))": "exp(-(x^2+y^2))",
};

const distributionSpecs = {
  bernoulli: {
    label: "Bernoulli",
    type: "discrete",
    params: [{ key: "p", label: "p", value: 0.5, min: 0, max: 1, step: 0.01 }],
    domain: [0, 1],
  },
  binomial: {
    label: "Binomial",
    type: "discrete",
    params: [
      { key: "n", label: "n", value: 12, min: 1, max: 200, step: 1 },
      { key: "p", label: "p", value: 0.5, min: 0, max: 1, step: 0.01 },
    ],
    domain: [0, 12],
  },
  beta: {
    label: "Beta",
    type: "continuous",
    params: [
      { key: "alpha", label: "alpha", value: 2, min: 0.1, max: 50, step: 0.1 },
      { key: "beta", label: "beta", value: 5, min: 0.1, max: 50, step: 0.1 },
    ],
    domain: [0, 1],
  },
  gamma: {
    label: "Gamma",
    type: "continuous",
    params: [
      { key: "shape", label: "shape", value: 2, min: 0.1, max: 50, step: 0.1 },
      { key: "scale", label: "scale", value: 2, min: 0.1, max: 50, step: 0.1 },
    ],
    domain: [0, 18],
  },
  chisquared: {
    label: "Chi-Squared",
    type: "continuous",
    params: [{ key: "df", label: "df", value: 4, min: 1, max: 100, step: 1 }],
    domain: [0, 16],
  },
  f: {
    label: "F-distribution",
    type: "continuous",
    params: [
      { key: "d1", label: "d1", value: 5, min: 1, max: 100, step: 1 },
      { key: "d2", label: "d2", value: 12, min: 1, max: 100, step: 1 },
    ],
    domain: [0, 6],
  },
  studentt: {
    label: "Student's T",
    type: "continuous",
    params: [{ key: "df", label: "df", value: 8, min: 1, max: 100, step: 1 }],
    domain: [-5, 5],
  },
  exponential: {
    label: "Exponential",
    type: "continuous",
    params: [{ key: "lambda", label: "lambda", value: 1, min: 0.05, max: 20, step: 0.05 }],
    domain: [0, 8],
  },
  hypergeometric: {
    label: "Hypergeometric",
    type: "discrete",
    params: [
      { key: "N", label: "population", value: 50, min: 1, max: 500, step: 1 },
      { key: "K", label: "successes", value: 18, min: 0, max: 500, step: 1 },
      { key: "n", label: "draws", value: 10, min: 0, max: 500, step: 1 },
    ],
    domain: [0, 10],
  },
  geometric: {
    label: "Geometric",
    type: "discrete",
    params: [{ key: "p", label: "p", value: 0.25, min: 0.01, max: 1, step: 0.01 }],
    domain: [1, 24],
  },
  normal: {
    label: "Normal",
    type: "continuous",
    params: [
      { key: "mu", label: "mean", value: 0, min: -20, max: 20, step: 0.1 },
      { key: "sigma", label: "std dev", value: 1, min: 0.05, max: 20, step: 0.05 },
    ],
    domain: [-5, 5],
  },
  cauchy: {
    label: "Cauchy",
    type: "continuous",
    params: [
      { key: "x0", label: "location", value: 0, min: -20, max: 20, step: 0.1 },
      { key: "gamma", label: "scale", value: 1, min: 0.05, max: 20, step: 0.05 },
    ],
    domain: [-10, 10],
  },
  poisson: {
    label: "Poisson",
    type: "discrete",
    params: [{ key: "lambda", label: "lambda", value: 4, min: 0.05, max: 80, step: 0.05 }],
    domain: [0, 18],
  },
  uniform: {
    label: "Uniform",
    type: "continuous",
    params: [
      { key: "a", label: "min", value: 0, min: -50, max: 50, step: 0.1 },
      { key: "b", label: "max", value: 1, min: -50, max: 50, step: 0.1 },
    ],
    domain: [-1, 2],
  },
  lognormal: {
    label: "Lognormal",
    type: "continuous",
    params: [
      { key: "mu", label: "log mean", value: 0, min: -10, max: 10, step: 0.1 },
      { key: "sigma", label: "log std", value: 0.5, min: 0.05, max: 10, step: 0.05 },
    ],
    domain: [0, 6],
  },
  weibull: {
    label: "Weibull",
    type: "continuous",
    params: [
      { key: "shape", label: "shape", value: 1.5, min: 0.1, max: 20, step: 0.1 },
      { key: "scale", label: "scale", value: 2, min: 0.1, max: 50, step: 0.1 },
    ],
    domain: [0, 8],
  },
  pareto: {
    label: "Pareto",
    type: "continuous",
    params: [
      { key: "xm", label: "xm", value: 1, min: 0.05, max: 20, step: 0.05 },
      { key: "alpha", label: "alpha", value: 3, min: 0.1, max: 20, step: 0.1 },
    ],
    domain: [0, 8],
  },
  laplace: {
    label: "Laplace",
    type: "continuous",
    params: [
      { key: "mu", label: "center", value: 0, min: -20, max: 20, step: 0.1 },
      { key: "b", label: "scale", value: 1, min: 0.05, max: 20, step: 0.05 },
    ],
    domain: [-8, 8],
  },
  logistic: {
    label: "Logistic",
    type: "continuous",
    params: [
      { key: "mu", label: "center", value: 0, min: -20, max: 20, step: 0.1 },
      { key: "s", label: "scale", value: 1, min: 0.05, max: 20, step: 0.05 },
    ],
    domain: [-8, 8],
  },
  rayleigh: {
    label: "Rayleigh",
    type: "continuous",
    params: [{ key: "sigma", label: "sigma", value: 1, min: 0.05, max: 20, step: 0.05 }],
    domain: [0, 6],
  },
};

function rotationMatrix(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, -s, s, c];
}

function currentMatrix() {
  const [a, b, c, d] = state.target;
  const t = state.mix;
  return [
    1 + (a - 1) * t,
    b * t,
    c * t,
    1 + (d - 1) * t,
  ];
}

function currentMatrix3() {
  const t = state.mix;
  return state.target3.map((value, index) => {
    const identity = index === 0 || index === 4 || index === 8 ? 1 : 0;
    return identity + (value - identity) * t;
  });
}

function applyMatrix(matrix, point) {
  const [a, b, c, d] = matrix;
  const [x, y] = point;
  return [a * x + b * y, c * x + d * y];
}

function applyMatrix3(matrix, point) {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const [x, y, z] = point;
  return [
    a * x + b * y + c * z,
    d * x + e * y + f * z,
    g * x + h * y + i * z,
  ];
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1];
}

function cross(left, right) {
  return left[0] * right[1] - left[1] * right[0];
}

function normalize(vector, fallback = [1, 0]) {
  const length = Math.hypot(vector[0], vector[1]);
  if (length < 1e-10) return fallback;
  return [vector[0] / length, vector[1] / length];
}

function perpendicular(vector) {
  return [-vector[1], vector[0]];
}

function scaleVector(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar];
}

function formatMatrix(matrix) {
  return `[${format(matrix[0], 2)} ${format(matrix[1], 2)}; ${format(matrix[2], 2)} ${format(matrix[3], 2)}]`;
}

function format(value, digits = 3) {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) < 1e-10) return "0.000";
  return value.toFixed(digits);
}

function logGamma(z) {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.9999999999998099;
  coefficients.forEach((coefficient, index) => {
    x += coefficient / (z + index + 1);
  });
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaFn(a, b) {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-abs * abs);
  return sign * y;
}

function logChoose(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function normalPdf(x, mu, sigma) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

function normalCdf(x, mu, sigma) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}

function distributionParamsValue() {
  const spec = distributionSpecs[distributionSelect.value];
  return Object.fromEntries(spec.params.map((param) => {
    const input = document.querySelector(`[data-dist-param="${param.key}"]`);
    const raw = Number(input?.value ?? param.value);
    return [param.key, clamp(Number.isFinite(raw) ? raw : param.value, param.min, param.max)];
  }));
}

function distributionPdf(key, x, p) {
  switch (key) {
    case "beta":
      return x <= 0 || x >= 1 ? 0 : (x ** (p.alpha - 1) * (1 - x) ** (p.beta - 1)) / betaFn(p.alpha, p.beta);
    case "gamma":
      return x < 0 ? 0 : (x ** (p.shape - 1) * Math.exp(-x / p.scale)) / (Math.exp(logGamma(p.shape)) * p.scale ** p.shape);
    case "chisquared":
      return distributionPdf("gamma", x, { shape: p.df / 2, scale: 2 });
    case "f":
      if (x <= 0) return 0;
      return ((p.d1 / p.d2) ** (p.d1 / 2) * x ** (p.d1 / 2 - 1)) / (betaFn(p.d1 / 2, p.d2 / 2) * (1 + (p.d1 * x) / p.d2) ** ((p.d1 + p.d2) / 2));
    case "studentt":
      return Math.exp(logGamma((p.df + 1) / 2) - logGamma(p.df / 2)) / Math.sqrt(p.df * Math.PI) * (1 + x * x / p.df) ** (-(p.df + 1) / 2);
    case "exponential":
      return x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x);
    case "normal":
      return normalPdf(x, p.mu, p.sigma);
    case "cauchy":
      return 1 / (Math.PI * p.gamma * (1 + ((x - p.x0) / p.gamma) ** 2));
    case "uniform": {
      const a = Math.min(p.a, p.b);
      const b = Math.max(p.a, p.b);
      return x < a || x > b || a === b ? 0 : 1 / (b - a);
    }
    case "lognormal":
      return x <= 0 ? 0 : Math.exp(-((Math.log(x) - p.mu) ** 2) / (2 * p.sigma * p.sigma)) / (x * p.sigma * Math.sqrt(2 * Math.PI));
    case "weibull":
      return x < 0 ? 0 : (p.shape / p.scale) * (x / p.scale) ** (p.shape - 1) * Math.exp(-((x / p.scale) ** p.shape));
    case "pareto":
      return x < p.xm ? 0 : (p.alpha * p.xm ** p.alpha) / x ** (p.alpha + 1);
    case "laplace":
      return Math.exp(-Math.abs(x - p.mu) / p.b) / (2 * p.b);
    case "logistic": {
      const z = Math.exp(-(x - p.mu) / p.s);
      return z / (p.s * (1 + z) ** 2);
    }
    case "rayleigh":
      return x < 0 ? 0 : (x / (p.sigma * p.sigma)) * Math.exp(-(x * x) / (2 * p.sigma * p.sigma));
    default:
      return 0;
  }
}

function distributionPmf(key, k, p) {
  if (!Number.isInteger(k)) return 0;
  switch (key) {
    case "bernoulli":
      return k === 0 ? 1 - p.p : k === 1 ? p.p : 0;
    case "binomial": {
      const n = Math.round(p.n);
      if (p.p <= 0) return k === 0 ? 1 : 0;
      if (p.p >= 1) return k === n ? 1 : 0;
      return k < 0 || k > n ? 0 : Math.exp(logChoose(n, k) + k * Math.log(p.p || 1e-12) + (n - k) * Math.log(1 - p.p || 1e-12));
    }
    case "hypergeometric": {
      const N = Math.max(1, Math.round(p.N));
      const K = clamp(Math.round(p.K), 0, N);
      const n = clamp(Math.round(p.n), 0, N);
      if (k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
      return Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n));
    }
    case "geometric":
      return k < 1 ? 0 : (1 - p.p) ** (k - 1) * p.p;
    case "poisson":
      return k < 0 ? 0 : Math.exp(k * Math.log(p.lambda) - p.lambda - logGamma(k + 1));
    default:
      return 0;
  }
}

function discreteCdf(key, x, p) {
  const end = Math.floor(x);

  switch (key) {
    case "bernoulli":
      if (x < 0) return 0;
      return x < 1 ? 1 - p.p : 1;
    case "binomial": {
      const n = Math.round(p.n);
      if (end < 0) return 0;
      if (end >= n) return 1;
      let probability = 0;
      for (let k = 0; k <= end; k += 1) probability += distributionPmf(key, k, p);
      return clamp(probability, 0, 1);
    }
    case "hypergeometric": {
      const N = Math.max(1, Math.round(p.N));
      const K = clamp(Math.round(p.K), 0, N);
      const n = clamp(Math.round(p.n), 0, N);
      const lower = Math.max(0, n - (N - K));
      const upper = Math.min(n, K);
      if (end < lower) return 0;
      if (end >= upper) return 1;
      let probability = 0;
      for (let k = lower; k <= end; k += 1) probability += distributionPmf(key, k, p);
      return clamp(probability, 0, 1);
    }
    case "geometric":
      return end < 1 ? 0 : clamp(1 - (1 - p.p) ** end, 0, 1);
    case "poisson": {
      if (end < 0) return 0;
      let term = Math.exp(-p.lambda);
      let probability = term;
      for (let k = 1; k <= end; k += 1) {
        term *= p.lambda / k;
        probability += term;
        if (probability > 1 - 1e-10) return 1;
      }
      return clamp(probability, 0, 1);
    }
    default:
      return 0;
  }
}

function distributionCdf(key, x, p) {
  if (distributionSpecs[key].type === "discrete") {
    return discreteCdf(key, x, p);
  }

  switch (key) {
    case "normal":
      return normalCdf(x, p.mu, p.sigma);
    case "exponential":
      return x < 0 ? 0 : 1 - Math.exp(-p.lambda * x);
    case "cauchy":
      return 0.5 + Math.atan((x - p.x0) / p.gamma) / Math.PI;
    case "uniform": {
      const a = Math.min(p.a, p.b);
      const b = Math.max(p.a, p.b);
      if (x <= a) return 0;
      if (x >= b) return 1;
      return (x - a) / (b - a);
    }
    case "lognormal":
      return x <= 0 ? 0 : normalCdf(Math.log(x), p.mu, p.sigma);
    case "weibull":
      return x < 0 ? 0 : 1 - Math.exp(-((x / p.scale) ** p.shape));
    case "pareto":
      return x < p.xm ? 0 : 1 - (p.xm / x) ** p.alpha;
    case "laplace":
      return x < p.mu ? 0.5 * Math.exp((x - p.mu) / p.b) : 1 - 0.5 * Math.exp(-(x - p.mu) / p.b);
    case "logistic":
      return 1 / (1 + Math.exp(-(x - p.mu) / p.s));
    case "rayleigh":
      return x < 0 ? 0 : 1 - Math.exp(-(x * x) / (2 * p.sigma * p.sigma));
    default:
      return numericCdf(key, x, p);
  }
}

function numericCdf(key, x, p) {
  const lowerBounds = {
    beta: 0,
    gamma: 0,
    chisquared: 0,
    f: 0,
    studentt: -60,
  };
  const rawLower = Number(document.querySelector("#distMin").value);
  const lower = lowerBounds[key] ?? (Number.isFinite(rawLower) ? rawLower : distributionSpecs[key].domain[0]);
  if (x <= lower) return 0;
  const steps = 420;
  const h = (x - lower) / steps;
  let area = 0;
  for (let i = 0; i < steps; i += 1) {
    const x1 = lower + h * i + h * 1e-4;
    const x2 = x1 + h;
    const y1 = distributionPdf(key, x1, p);
    const y2 = distributionPdf(key, x2, p);
    area += ((Number.isFinite(y1) ? y1 : 0) + (Number.isFinite(y2) ? y2 : 0)) * h * 0.5;
  }
  return clamp(area, 0, 1);
}

function distributionStats(key, p) {
  switch (key) {
    case "bernoulli":
      return { mean: p.p, variance: p.p * (1 - p.p), support: "{0, 1}" };
    case "binomial":
      return { mean: p.n * p.p, variance: p.n * p.p * (1 - p.p), support: `0..${Math.round(p.n)}` };
    case "beta":
      return { mean: p.alpha / (p.alpha + p.beta), variance: (p.alpha * p.beta) / (((p.alpha + p.beta) ** 2) * (p.alpha + p.beta + 1)), support: "[0, 1]" };
    case "gamma":
      return { mean: p.shape * p.scale, variance: p.shape * p.scale * p.scale, support: "[0, infinity)" };
    case "chisquared":
      return { mean: p.df, variance: 2 * p.df, support: "[0, infinity)" };
    case "f":
      return { mean: p.d2 > 2 ? p.d2 / (p.d2 - 2) : NaN, variance: p.d2 > 4 ? (2 * p.d2 * p.d2 * (p.d1 + p.d2 - 2)) / (p.d1 * (p.d2 - 2) ** 2 * (p.d2 - 4)) : NaN, support: "[0, infinity)" };
    case "studentt":
      return { mean: p.df > 1 ? 0 : NaN, variance: p.df > 2 ? p.df / (p.df - 2) : NaN, support: "real line" };
    case "exponential":
      return { mean: 1 / p.lambda, variance: 1 / (p.lambda * p.lambda), support: "[0, infinity)" };
    case "hypergeometric": {
      const N = Math.max(1, Math.round(p.N));
      const K = clamp(Math.round(p.K), 0, N);
      const n = clamp(Math.round(p.n), 0, N);
      return { mean: n * K / N, variance: n * (K / N) * (1 - K / N) * ((N - n) / Math.max(1, N - 1)), support: `${Math.max(0, n - (N - K))}..${Math.min(n, K)}` };
    }
    case "geometric":
      return { mean: 1 / p.p, variance: (1 - p.p) / (p.p * p.p), support: "1, 2, 3, ..." };
    case "normal":
      return { mean: p.mu, variance: p.sigma * p.sigma, support: "real line" };
    case "cauchy":
      return { mean: NaN, variance: NaN, support: "real line" };
    case "poisson":
      return { mean: p.lambda, variance: p.lambda, support: "0, 1, 2, ..." };
    case "uniform": {
      const a = Math.min(p.a, p.b);
      const b = Math.max(p.a, p.b);
      return { mean: (a + b) / 2, variance: ((b - a) ** 2) / 12, support: `[${format(a, 2)}, ${format(b, 2)}]` };
    }
    case "lognormal":
      return { mean: Math.exp(p.mu + p.sigma * p.sigma / 2), variance: (Math.exp(p.sigma * p.sigma) - 1) * Math.exp(2 * p.mu + p.sigma * p.sigma), support: "(0, infinity)" };
    case "weibull":
      return { mean: p.scale * Math.exp(logGamma(1 + 1 / p.shape)), variance: p.scale * p.scale * (Math.exp(logGamma(1 + 2 / p.shape)) - Math.exp(logGamma(1 + 1 / p.shape)) ** 2), support: "[0, infinity)" };
    case "pareto":
      return { mean: p.alpha > 1 ? (p.alpha * p.xm) / (p.alpha - 1) : NaN, variance: p.alpha > 2 ? (p.xm * p.xm * p.alpha) / ((p.alpha - 1) ** 2 * (p.alpha - 2)) : NaN, support: `[${format(p.xm, 2)}, infinity)` };
    case "laplace":
      return { mean: p.mu, variance: 2 * p.b * p.b, support: "real line" };
    case "logistic":
      return { mean: p.mu, variance: (Math.PI * Math.PI * p.s * p.s) / 3, support: "real line" };
    case "rayleigh":
      return { mean: p.sigma * Math.sqrt(Math.PI / 2), variance: ((4 - Math.PI) / 2) * p.sigma * p.sigma, support: "[0, infinity)" };
    default:
      return { mean: NaN, variance: NaN, support: "n/a" };
  }
}

function distributionInsight(key, p) {
  const info = {
    normal: "Symmetric bell curve; mean shifts center and standard deviation controls spread and tails.",
    studentt: "Symmetric with heavier tails than normal; larger degrees of freedom approaches normal.",
    chisquared: "Right-skewed positive distribution; degrees of freedom add under independent sums.",
    f: "Right-skewed ratio family; df1 controls numerator shape and df2 controls tail thickness.",
    gamma: "Positive skewed family; shape smooths skew and scale stretches the axis.",
    exponential: "Memoryless positive distribution; lambda increases concentration near zero.",
    beta: "Bounded on [0, 1]; alpha and beta move mass toward either edge or center.",
    binomial: "Discrete count distribution; n sets trials and p moves mass toward successes.",
    poisson: "Discrete count distribution; lambda is both mean and variance.",
    uniform: "Flat density over a bounded interval.",
    cauchy: "Very heavy-tailed with undefined mean and variance.",
    lognormal: "Positive heavy right tail; log parameters shape multiplicative growth.",
    weibull: "Positive lifetime family; shape controls increasing or decreasing hazard.",
    pareto: "Power-law heavy tail; alpha controls tail weight.",
    logistic: "Symmetric S-curve CDF family with slightly heavier tails than normal.",
    rayleigh: "Positive distribution often tied to vector magnitudes.",
    laplace: "Sharp peak and exponential tails around its center.",
    hypergeometric: "Sampling without replacement; population composition changes dependence.",
    geometric: "Waiting-time distribution; p controls how quickly mass decays.",
    bernoulli: "Single binary trial; p is the success probability.",
  };
  return info[key] || "Parameter changes reshape location, spread, skew, and tail behavior.";
}

function snapshotDistribution() {
  const key = distributionSelect.value;
  return {
    id: state.nextLayerId,
    key,
    label: distributionSpecs[key].label,
    params: distributionParamsValue(),
    weight: 1,
  };
}

function distributionValue(key, x, params, isCdf) {
  const spec = distributionSpecs[key];
  if (spec.type === "discrete") {
    const k = Math.round(x);
    return isCdf ? distributionCdf(key, k, params) : distributionPmf(key, k, params);
  }
  return isCdf ? distributionCdf(key, x, params) : distributionPdf(key, x, params);
}

function buildDistributionPoints(key, params, min, max, isCdf) {
  const spec = distributionSpecs[key];
  const points = [];

  if (spec.type === "discrete") {
    const start = Math.ceil(min);
    const end = Math.floor(max);
    let cumulative = 0;
    const allStart = Math.min(start, Math.floor(spec.domain[0]));
    for (let k = allStart; k <= end; k += 1) {
      const pmf = distributionPmf(key, k, params);
      cumulative += pmf;
      if (k >= start) points.push({ x: k, y: isCdf ? cumulative : pmf });
    }
    return points;
  }

  const count = 260;
  for (let i = 0; i <= count; i += 1) {
    const x = min + (max - min) * (i / count);
    points.push({ x, y: distributionValue(key, x, params, isCdf) });
  }
  return points;
}

function intervalProbability(key, params, from, to) {
  const spec = distributionSpecs[key];
  const a = Math.min(from, to);
  const b = Math.max(from, to);

  if (spec.type === "discrete") {
    let probability = 0;
    for (let k = Math.ceil(a); k <= Math.floor(b); k += 1) {
      probability += distributionPmf(key, k, params);
    }
    return clamp(probability, 0, 1);
  }

  return clamp(distributionCdf(key, b, params) - distributionCdf(key, a, params), 0, 1);
}

function renderLayerList() {
  const list = document.querySelector("#distributionLayers");
  list.innerHTML = "";

  if (!state.distributionLayers.length) {
    const empty = document.createElement("p");
    empty.className = "empty-layer-list";
    empty.textContent = "No saved layers";
    list.append(empty);
    return;
  }

  state.distributionLayers.forEach((layer, index) => {
    const row = document.createElement("div");
    row.className = "layer-row";
    row.dataset.layerId = String(layer.id);

    const name = document.createElement("strong");
    name.textContent = `${index + 1}. ${layer.label}`;

    const weightLabel = document.createElement("label");
    const weightText = document.createElement("span");
    const weightInput = document.createElement("input");
    weightText.textContent = "w";
    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.max = "10";
    weightInput.step = "0.1";
    weightInput.value = String(layer.weight);
    weightInput.dataset.layerWeight = String(layer.id);
    weightLabel.append(weightText, weightInput);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeLayer = String(layer.id);
    remove.ariaLabel = `Remove ${layer.label} layer`;
    remove.title = "Remove layer";
    remove.textContent = "x";

    const paramGrid = document.createElement("div");
    paramGrid.className = "layer-params";
    distributionSpecs[layer.key].params.forEach((param) => {
      const paramLabel = document.createElement("label");
      const paramText = document.createElement("span");
      const paramInput = document.createElement("input");
      paramText.textContent = param.label;
      paramInput.type = "number";
      paramInput.min = String(param.min);
      paramInput.max = String(param.max);
      paramInput.step = String(param.step);
      paramInput.value = String(layer.params[param.key]);
      paramInput.dataset.layerParamId = String(layer.id);
      paramInput.dataset.layerParamKey = param.key;
      paramLabel.append(paramText, paramInput);
      paramGrid.append(paramLabel);
    });

    row.append(name, weightLabel, remove, paramGrid);
    list.append(row);
  });
}

function updateDistributionHover(event) {
  if (!state.lastPlot || state.activeMode !== "distribution") return;
  const { area, min, max, key, params, isCdf, yMax, points } = state.lastPlot;
  const x = min + ((event.offsetX - area.left) / area.width) * (max - min);

  if (event.offsetX < area.left || event.offsetX > area.right || event.offsetY < area.top || event.offsetY > area.bottom) {
    document.querySelector("#hoverReadout").textContent = "Move over the plot to inspect x and probability height.";
    drawDistribution();
    return;
  }

  const spec = distributionSpecs[key];
  const probeX = spec.type === "discrete" ? Math.round(x) : x;
  const value = points?.length ? interpolatePoints(points, probeX) : distributionValue(key, probeX, params, isCdf);
  const sx = area.left + ((probeX - min) / (max - min)) * area.width;
  const sy = area.bottom - (clamp(value, 0, yMax) / yMax) * area.height;

  drawDistribution();
  ctx.save();
  ctx.strokeStyle = colors.probe;
  ctx.fillStyle = colors.probe;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(sx, area.top);
  ctx.lineTo(sx, area.bottom);
  ctx.moveTo(area.left, sy);
  ctx.lineTo(area.right, sy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(sx, sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const label = points?.length ? (isCdf ? "CDF" : "PDF") : isCdf ? "CDF" : spec.type === "discrete" ? "PMF" : "PDF";
  document.querySelector("#hoverReadout").textContent = `x = ${format(probeX, 3)}, ${label} = ${format(value, 4)}`;
}

function syncControlsFromTarget() {
  inputIds.forEach((id, index) => {
    const value = format(state.target[index]);
    inputs[id].value = value;
    const slider = sliders.find((item) => item.dataset.cell === id);
    slider.value = clamp(state.target[index], -3, 3);
  });
}

function setTarget(matrix) {
  state.target = matrix.map((value) => Number(value));
  state.mix = 1;
  document.querySelector("#mix").value = "1";
  syncControlsFromTarget();
  update();
}

function syncControlsFromTarget3() {
  input3Ids.forEach((id, index) => {
    inputs3[id].value = format(state.target3[index]);
  });
}

function setTarget3(matrix) {
  state.target3 = matrix.map((value) => Number(value));
  state.mix = 1;
  document.querySelector("#mix").value = "1";
  syncControlsFromTarget3();
  update();
}

function determinant3(matrix) {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function worldToScreen(point) {
  const rect = canvas.getBoundingClientRect();
  return [
    rect.width / 2 + state.pan.x + point[0] * state.scale,
    rect.height / 2 + state.pan.y - point[1] * state.scale,
  ];
}

function screenToWorld(point) {
  const rect = canvas.getBoundingClientRect();
  return [
    (point[0] - rect.width / 2 - state.pan.x) / state.scale,
    -(point[1] - rect.height / 2 - state.pan.y) / state.scale,
  ];
}

function clear() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  gradient.addColorStop(0, "#0d1320");
  gradient.addColorStop(0.55, "#09101b");
  gradient.addColorStop(1, "#070a12");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);
}

function drawLine(from, to, color, width = 1, dash = []) {
  const [x1, y1] = worldToScreen(from);
  const [x2, y2] = worldToScreen(to);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(from, to, color, label) {
  const [x1, y1] = worldToScreen(from);
  const [x2, y2] = worldToScreen(to);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 12;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.fillText(label, x2 + 8, y2 - 8);
  }
  ctx.restore();
}

function drawPolyline(points, color, width = 2, closed = false, alpha = 1) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  points.forEach((point, index) => {
    const [x, y] = worldToScreen(point);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPoint(point, color, radius = 4) {
  const [x, y] = worldToScreen(point);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrid(matrix) {
  const rect = canvas.getBoundingClientRect();
  const topLeft = screenToWorld([0, 0]);
  const bottomRight = screenToWorld([rect.width, rect.height]);
  const span = Math.max(
    Math.abs(topLeft[0]), Math.abs(bottomRight[0]),
    Math.abs(topLeft[1]), Math.abs(bottomRight[1])
  ) + 2;
  const limit = Math.ceil(clamp(span, 6, 30));

  if (toggles.grid.checked) {
    for (let n = -limit; n <= limit; n += 1) {
      drawLine(applyMatrix(matrix, [n, -limit]), applyMatrix(matrix, [n, limit]), colors.grid, n === 0 ? 1.2 : 0.55);
      drawLine(applyMatrix(matrix, [-limit, n]), applyMatrix(matrix, [limit, n]), colors.grid, n === 0 ? 1.2 : 0.55);
    }
  }

  drawLine([-limit, 0], [limit, 0], colors.axis, 1.2);
  drawLine([0, -limit], [0, limit], colors.axis, 1.2);
}

function unitCirclePoints(matrix) {
  const points = [];
  for (let i = 0; i <= 160; i += 1) {
    const theta = (i / 160) * Math.PI * 2;
    points.push(applyMatrix(matrix, [Math.cos(theta), Math.sin(theta)]));
  }
  return points;
}

function unitSquarePoints(matrix) {
  return [[0, 0], [1, 0], [1, 1], [0, 1]].map((point) => applyMatrix(matrix, point));
}

function eigenVectorFor(matrix, lambda, fallback) {
  const [a, b, c, d] = matrix;
  let vector;
  if (Math.abs(b) > Math.abs(c)) vector = [b, lambda - a];
  else vector = [lambda - d, c];
  return normalize(vector, fallback);
}

function eigenData(matrix) {
  const [a, b, c, d] = matrix;
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < -1e-9) {
    const real = tr / 2;
    const imaginary = Math.sqrt(-disc) / 2;
    return {
      valuesText: `${format(real)} +/- ${format(imaginary)}i`,
      values: [],
      realVectors: [],
      diagonalizable: false,
      status: "Complex eigenvalues: no real eigenbasis for this matrix.",
    };
  }

  const root = Math.sqrt(Math.max(0, disc));
  const values = [(tr + root) / 2, (tr - root) / 2];
  const realVectors = [];
  const scalarMatrix = Math.abs(b) < 1e-8 && Math.abs(c) < 1e-8 && Math.abs(a - d) < 1e-8;

  if (scalarMatrix) {
    realVectors.push([1, 0], [0, 1]);
  } else {
    values.forEach((lambda) => {
      const vector = eigenVectorFor(matrix, lambda, realVectors.length ? perpendicular(realVectors[0]) : [1, 0]);
      if (!realVectors.some((v) => Math.abs(cross(v, vector)) < 1e-5)) {
        realVectors.push(vector);
      }
    });
  }

  return {
    valuesText: values.map((value) => format(value)).join(", "),
    values,
    realVectors,
    diagonalizable: realVectors.length === 2,
    status: realVectors.length === 2 ? "A has a real eigenbasis P, so A = P D P^-1." : "Only one real eigen direction is available.",
  };
}

function svdData(matrix) {
  const [a, b, c, d] = matrix;
  const ata = [a * a + c * c, a * b + c * d, a * b + c * d, b * b + d * d];
  const tr = ata[0] + ata[3];
  const det = ata[0] * ata[3] - ata[1] * ata[2];
  const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
  const lambda1 = Math.max(0, (tr + disc) / 2);
  const lambda2 = Math.max(0, (tr - disc) / 2);
  const s1 = Math.sqrt(lambda1);
  const s2 = Math.sqrt(lambda2);

  let v1;
  if (Math.abs(ata[1]) < 1e-10 && Math.abs(ata[0] - ata[3]) < 1e-10) {
    v1 = [1, 0];
  } else {
    v1 = normalize([ata[1], lambda1 - ata[0]], [1, 0]);
  }
  const v2 = perpendicular(v1);

  let u1 = s1 > 1e-10 ? normalize(applyMatrix(matrix, v1), [1, 0]) : [1, 0];
  let u2 = s2 > 1e-10 ? normalize(applyMatrix(matrix, v2), perpendicular(u1)) : perpendicular(u1);

  return {
    values: [s1, s2],
    u: [u1[0], u2[0], u1[1], u2[1]],
    sigma: [s1, 0, 0, s2],
    vt: [v1[0], v1[1], v2[0], v2[1]],
    v1,
    v2,
    u1,
    u2,
  };
}

function inverse2(matrix) {
  const [a, b, c, d] = matrix;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) return null;
  return [d / det, -b / det, -c / det, a / det];
}

function eigendecompositionData(matrix) {
  const eigen = eigenData(matrix);
  if (!eigen.diagonalizable) {
    return { ...eigen, p: null, d: null, pinv: null };
  }

  const [v1, v2] = eigen.realVectors;
  const p = [v1[0], v2[0], v1[1], v2[1]];
  return {
    ...eigen,
    p,
    d: [eigen.values[0], 0, 0, eigen.values[1]],
    pinv: inverse2(p),
  };
}

function drawVectorPair(first, second, color, firstLabel, secondLabel) {
  drawArrow([0, 0], first, color, firstLabel);
  drawArrow([0, 0], second, color, secondLabel);
}

function drawSvdOverlay(matrix) {
  const svd = svdData(matrix);
  const scaledV1 = scaleVector(svd.v1, 1.25);
  const scaledV2 = scaleVector(svd.v2, 1.25);
  const sigmaV1 = scaleVector(svd.v1, svd.values[0]);
  const sigmaV2 = scaleVector(svd.v2, svd.values[1]);
  const scaledU1 = scaleVector(svd.u1, svd.values[0]);
  const scaledU2 = scaleVector(svd.u2, svd.values[1]);

  drawLine(scaleVector(svd.v1, -10), scaleVector(svd.v1, 10), colors.svd, 1.6, [5, 7]);
  drawLine(scaleVector(svd.v2, -10), scaleVector(svd.v2, 10), colors.svd, 1.6, [5, 7]);
  drawVectorPair(scaledV1, scaledV2, colors.svd, "", "");
  drawVectorPair(sigmaV1, sigmaV2, colors.eigen, "", "");
  drawVectorPair(scaledU1, scaledU2, colors.transformed, "", "");
}

function drawEigenOverlay(matrix) {
  const decomposition = eigendecompositionData(matrix);
  decomposition.realVectors.forEach((vector, index) => {
    const lambda = decomposition.values[index] ?? 1;
    drawLine(scaleVector(vector, -10), scaleVector(vector, 10), colors.eigen, 1.8, [7, 7]);
    drawArrow([0, 0], scaleVector(vector, 1.35), colors.eigen, "");
    drawArrow([0, 0], scaleVector(vector, lambda), colors.transformed, "");
  });
}

function drawDecompositionMode(matrix) {
  if (state.activeMode === "svd") {
    drawSvdOverlay(matrix);
    return;
  }

  if (state.activeMode === "eigen") {
    drawEigenOverlay(matrix);
  }
}

function drawEigenLines(matrix) {
  const eigen = eigenData(matrix);
  eigen.realVectors.forEach((vector) => {
    drawLine([vector[0] * -10, vector[1] * -10], [vector[0] * 10, vector[1] * 10], colors.eigen, 1.8, [7, 7]);
  });
}

function drawProbe(matrix) {
  const source = [
    Number(document.querySelector("#probeX").value) || 0,
    Number(document.querySelector("#probeY").value) || 0,
  ];
  const target = applyMatrix(matrix, source);
  drawArrow([0, 0], source, colors.probe, "");
  drawArrow([0, 0], target, colors.transformed, "");
  document.querySelector("#probeResult").textContent = `A[${format(source[0], 2)}, ${format(source[1], 2)}] = [${format(target[0], 2)}, ${format(target[1], 2)}]`;
}

function projectionScale3() {
  const rect = canvas.getBoundingClientRect();
  const fitScale = Math.max(26, Math.min(rect.width / 12.5, rect.height / 10.25));
  return Math.min(state.scale, fitScale);
}

function project3(point) {
  const rect = canvas.getBoundingClientRect();
  const scale = projectionScale3();
  const [x, y, z] = point;
  return [
    rect.width / 2 + state.pan.x + (x - z * 0.72) * scale,
    rect.height / 2 + state.pan.y - (y - z * 0.42) * scale,
  ];
}

function drawLine3(from, to, color, width = 1, dash = [], alpha = 1) {
  const [x1, y1] = project3(from);
  const [x2, y2] = project3(to);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawArrow3(from, to, color, label = "") {
  const [x1, y1] = project3(from);
  const [x2, y2] = project3(to);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 10;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.fillText(label, x2 + 6, y2 - 6);
  }
  ctx.restore();
}

function drawCube3(matrix, color, alpha = 1) {
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ].map((point) => applyMatrix3(matrix, point));
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  edges.forEach(([a, b]) => drawLine3(vertices[a], vertices[b], color, 1.6, [], alpha));
}

function draw3DTransform(matrix) {
  const limit = 4;
  if (toggles.grid.checked) {
    for (let n = -limit; n <= limit; n += 1) {
      drawLine3(applyMatrix3(matrix, [n, -limit, 0]), applyMatrix3(matrix, [n, limit, 0]), colors.grid, 0.85, [], 0.72);
      drawLine3(applyMatrix3(matrix, [-limit, n, 0]), applyMatrix3(matrix, [limit, n, 0]), colors.grid, 0.85, [], 0.72);
      drawLine3(applyMatrix3(matrix, [n, 0, -limit]), applyMatrix3(matrix, [n, 0, limit]), colors.grid, 0.65, [], 0.42);
      drawLine3(applyMatrix3(matrix, [-limit, 0, n]), applyMatrix3(matrix, [limit, 0, n]), colors.grid, 0.65, [], 0.42);
      drawLine3(applyMatrix3(matrix, [0, n, -limit]), applyMatrix3(matrix, [0, n, limit]), colors.grid, 0.55, [], 0.34);
      drawLine3(applyMatrix3(matrix, [0, -limit, n]), applyMatrix3(matrix, [0, limit, n]), colors.grid, 0.55, [], 0.34);
    }
  }

  drawLine3([-limit, 0, 0], [limit, 0, 0], colors.axis, 1.1);
  drawLine3([0, -limit, 0], [0, limit, 0], colors.axis, 1.1);
  drawLine3([0, 0, -limit], [0, 0, limit], colors.axis, 1.1);

  if (toggles.square.checked || toggles.circle.checked) {
    drawCube3([1, 0, 0, 0, 1, 0, 0, 0, 1], colors.original, 0.36);
    drawCube3(matrix, colors.transformed, 0.92);
  }

  if (toggles.basis.checked) {
    drawArrow3([0, 0, 0], applyMatrix3(matrix, [1, 0, 0]), colors.i, basisLabels.i);
    drawArrow3([0, 0, 0], applyMatrix3(matrix, [0, 1, 0]), colors.j, basisLabels.j);
    drawArrow3([0, 0, 0], applyMatrix3(matrix, [0, 0, 1]), colors.k, basisLabels.k);
  }
}

function canvasPlotArea() {
  const rect = canvas.getBoundingClientRect();
  return {
    left: 58,
    right: rect.width - 24,
    top: 28,
    bottom: rect.height - 52,
    width: rect.width - 82,
    height: rect.height - 80,
  };
}

function drawPlotAxes(area, xMin, xMax, yMax) {
  ctx.save();
  ctx.strokeStyle = colors.axis;
  ctx.fillStyle = "#96a3b7";
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.beginPath();
  ctx.moveTo(area.left, area.bottom);
  ctx.lineTo(area.right, area.bottom);
  ctx.moveTo(area.left, area.top);
  ctx.lineTo(area.left, area.bottom);
  ctx.stroke();

  for (let i = 0; i <= 5; i += 1) {
    const x = area.left + area.width * (i / 5);
    const value = xMin + (xMax - xMin) * (i / 5);
    ctx.strokeStyle = "rgba(124, 135, 141, 0.18)";
    ctx.beginPath();
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.stroke();
    ctx.fillStyle = "#96a3b7";
    ctx.fillText(format(value, 2), x - 16, area.bottom + 22);
  }

  for (let i = 0; i <= 4; i += 1) {
    const y = area.bottom - area.height * (i / 4);
    const value = yMax * (i / 4);
    ctx.strokeStyle = "rgba(124, 135, 141, 0.18)";
    ctx.beginPath();
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.fillStyle = "#96a3b7";
    ctx.fillText(format(value, 2), 12, y + 4);
  }
  ctx.restore();
}

function drawFunctionAxes(area, xMin, xMax, yMin, yMax) {
  const xToScreen = (x) => area.left + ((x - xMin) / (xMax - xMin)) * area.width;
  const yToScreen = (y) => area.bottom - ((y - yMin) / (yMax - yMin)) * area.height;

  ctx.save();
  ctx.strokeStyle = "rgba(143, 160, 181, 0.28)";
  ctx.fillStyle = "#96a3b7";
  ctx.lineWidth = 1;
  ctx.font = "12px Space Mono, Consolas, monospace";

  for (let i = 0; i <= 5; i += 1) {
    const x = xMin + (xMax - xMin) * (i / 5);
    const sx = xToScreen(x);
    ctx.beginPath();
    ctx.moveTo(sx, area.top);
    ctx.lineTo(sx, area.bottom);
    ctx.stroke();
    ctx.fillText(format(x, 2), sx - 18, area.bottom + 22);
  }

  for (let i = 0; i <= 4; i += 1) {
    const y = yMin + (yMax - yMin) * (i / 4);
    const sy = yToScreen(y);
    ctx.beginPath();
    ctx.moveTo(area.left, sy);
    ctx.lineTo(area.right, sy);
    ctx.stroke();
    ctx.fillText(format(y, 2), 12, sy + 4);
  }

  ctx.strokeStyle = "rgba(190, 208, 230, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(area.left, area.top, area.width, area.height);
  if (xMin <= 0 && xMax >= 0) {
    const sx = xToScreen(0);
    ctx.beginPath();
    ctx.moveTo(sx, area.top);
    ctx.lineTo(sx, area.bottom);
    ctx.stroke();
  }
  if (yMin <= 0 && yMax >= 0) {
    const sy = yToScreen(0);
    ctx.beginPath();
    ctx.moveTo(area.left, sy);
    ctx.lineTo(area.right, sy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDerivativeFlow(samples, derivativeSamples, area, min, max, low, high) {
  if (!state.showGradientFlow) return;
  if (derivativeSamples.length < 3) return;
  const xToScreen = (x) => area.left + ((x - min) / (max - min)) * area.width;
  const yToScreen = (y) => area.bottom - ((y - low) / (high - low)) * area.height;

  ctx.save();
  ctx.strokeStyle = "rgba(72, 224, 164, 0.78)";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([7, 8]);
  ctx.shadowColor = colors.j;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  derivativeSamples.forEach((point, index) => {
    const x = xToScreen(point.x);
    const y = yToScreen(point.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const phase = state.flowPhase % 1;
  const particleCount = Math.max(4, state.flowDensity + 2);
  for (let i = 0; i < particleCount; i += 1) {
    const t = (phase + i / particleCount) % 1;
    const index = Math.min(derivativeSamples.length - 1, Math.floor(t * (derivativeSamples.length - 1)));
    const point = derivativeSamples[index];
    const x = xToScreen(point.x);
    const y = yToScreen(point.y);
    const alpha = 0.5 + 0.18 * Math.sin((phase * Math.PI * 2) + i * 0.7);
    ctx.fillStyle = `rgba(72, 224, 164, ${alpha})`;
    ctx.shadowColor = colors.j;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(220, 255, 238, 0.95)";
  ctx.font = "700 12px Space Mono, Consolas, monospace";
  const labelPoint = derivativeSamples[Math.floor(derivativeSamples.length * 0.78)];
  ctx.fillText("f'(x)", xToScreen(labelPoint.x) + 8, yToScreen(labelPoint.y) - 8);
  ctx.restore();
}

function drawDistributionSeries(points, spec, area, min, max, yMax, color, alpha = 1) {
  const xToScreen = (x) => area.left + ((x - min) / (max - min)) * area.width;
  const yToScreen = (y) => area.bottom - (clamp(y, 0, yMax) / yMax) * area.height;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.3;
  ctx.shadowColor = color;
  ctx.shadowBlur = alpha >= 0.9 ? 1 : 0;

  if (spec.type === "discrete") {
    const barWidth = Math.max(4, area.width / Math.max(8, Math.floor(max - min + 1)) * 0.62);
    points.forEach((point) => {
      const x = xToScreen(point.x);
      const y = yToScreen(point.y);
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillRect(x - barWidth / 2, y, barWidth, area.bottom - y);
      ctx.globalAlpha = alpha;
      ctx.strokeRect(x - barWidth / 2, y, barWidth, area.bottom - y);
    });
    ctx.restore();
    return;
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xToScreen(point.x);
    const y = yToScreen(point.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.17;
  ctx.lineTo(area.right, area.bottom);
  ctx.lineTo(area.left, area.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIntervalBand(points, spec, area, min, max, yMax, from, to) {
  const a = Math.max(min, Math.min(from, to));
  const b = Math.min(max, Math.max(from, to));
  if (b < min || a > max || a >= b) return;

  const xToScreen = (x) => area.left + ((x - min) / (max - min)) * area.width;
  const yToScreen = (y) => area.bottom - (clamp(y, 0, yMax) / yMax) * area.height;

  ctx.save();
  ctx.fillStyle = "rgba(255, 107, 97, 0.22)";
  ctx.strokeStyle = colors.transformed;
  ctx.lineWidth = 1.5;

  if (spec.type === "discrete") {
    const barWidth = Math.max(4, area.width / Math.max(8, Math.floor(max - min + 1)) * 0.62);
    points
      .filter((point) => point.x >= Math.ceil(a) && point.x <= Math.floor(b))
      .forEach((point) => {
        const x = xToScreen(point.x);
        const y = yToScreen(point.y);
        ctx.fillRect(x - barWidth / 2, y, barWidth, area.bottom - y);
      });
    ctx.restore();
    return;
  }

  const selected = points.filter((point) => point.x >= a && point.x <= b);
  if (selected.length < 2) {
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(xToScreen(selected[0].x), area.bottom);
  selected.forEach((point) => ctx.lineTo(xToScreen(point.x), yToScreen(point.y)));
  ctx.lineTo(xToScreen(selected[selected.length - 1].x), area.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function buildCombinedPoints(activeLayer, layers, min, max, isCdf, mode) {
  if (mode === "standardization") {
    const stats = distributionStats(activeLayer.key, activeLayer.params);
    const sd = Math.sqrt(stats.variance);
    if (!Number.isFinite(sd) || sd <= 0) return [];
    const points = [];
    const count = 260;
    for (let i = 0; i <= count; i += 1) {
      const z = min + (max - min) * (i / count);
      const x = stats.mean + sd * z;
      points.push({ x: z, y: isCdf ? distributionCdf(activeLayer.key, x, activeLayer.params) : densityAt(activeLayer, x) * sd });
    }
    return points;
  }

  const allLayers = [activeLayer, ...layers].filter((layer) => layer.weight > 0);
  if (!allLayers.length) return [];
  const weightTotal = allLayers.reduce((sum, layer) => sum + layer.weight, 0) || 1;
  const points = [];
  const allDiscrete = allLayers.every((layer) => distributionSpecs[layer.key].type === "discrete");

  if (allDiscrete) {
    for (let k = Math.ceil(min); k <= Math.floor(max); k += 1) {
      const y = allLayers.reduce((sum, layer) => {
        const weighted = distributionValue(layer.key, k, layer.params, isCdf) * layer.weight;
        return sum + weighted;
      }, 0);
      points.push({ x: k, y: mode === "mixture" ? y / weightTotal : y });
    }
    return points;
  }

  const count = 260;
  for (let i = 0; i <= count; i += 1) {
    const x = min + (max - min) * (i / count);
    const y = allLayers.reduce((sum, layer) => {
      const weighted = distributionValue(layer.key, x, layer.params, isCdf) * layer.weight;
      return sum + weighted;
    }, 0);
    points.push({ x, y: mode === "mixture" ? y / weightTotal : y });
  }

  return points;
}

function integrationBounds(layer) {
  const { key, params: p } = layer;
  switch (key) {
    case "normal":
      return [p.mu - 6 * p.sigma, p.mu + 6 * p.sigma];
    case "studentt":
      return [-24, 24];
    case "cauchy":
      return [p.x0 - 50 * p.gamma, p.x0 + 50 * p.gamma];
    case "beta":
      return [0, 1];
    case "gamma":
      return [0, p.shape * p.scale + 8 * Math.sqrt(p.shape) * p.scale];
    case "chisquared":
      return [0, p.df + 8 * Math.sqrt(2 * p.df)];
    case "f":
      return [0, 18];
    case "exponential":
      return [0, 10 / p.lambda];
    case "uniform":
      return [Math.min(p.a, p.b), Math.max(p.a, p.b)];
    case "lognormal":
      return [0, Math.exp(p.mu + 5 * p.sigma)];
    case "weibull":
      return [0, p.scale * 7];
    case "pareto":
      return [p.xm, p.xm * 40];
    case "laplace":
      return [p.mu - 12 * p.b, p.mu + 12 * p.b];
    case "logistic":
      return [p.mu - 12 * p.s, p.mu + 12 * p.s];
    case "rayleigh":
      return [0, p.sigma * 8];
    default:
      return distributionSpecs[key].domain;
  }
}

function densityAt(layer, x) {
  if (distributionSpecs[layer.key].type !== "continuous") return 0;
  const value = distributionPdf(layer.key, x, layer.params);
  return Number.isFinite(value) ? value : 0;
}

function derivedPdfValue(mode, xLayer, yLayer, z) {
  if (mode === "variableSum" && xLayer.key === "normal" && yLayer.key === "normal") {
    return normalPdf(z, xLayer.params.mu + yLayer.params.mu, Math.hypot(xLayer.params.sigma, yLayer.params.sigma));
  }
  if (mode === "variableSum" && xLayer.key === "chisquared" && yLayer.key === "chisquared") {
    return distributionPdf("chisquared", z, { df: xLayer.params.df + yLayer.params.df });
  }
  if (mode === "fRatio" && xLayer.key === "chisquared" && yLayer.key === "chisquared") {
    return distributionPdf("f", z, { d1: xLayer.params.df, d2: yLayer.params.df });
  }

  const [xLow, xHigh] = integrationBounds(xLayer);
  const [yLow, yHigh] = integrationBounds(yLayer);
  const steps = 110;
  const integrate = (low, high, sample) => {
    const h = (high - low) / steps;
    let total = 0;
    for (let i = 0; i < steps; i += 1) {
      const t1 = low + h * i;
      const t2 = t1 + h;
      total += (sample(t1) + sample(t2)) * h * 0.5;
    }
    return Number.isFinite(total) ? Math.max(0, total) : 0;
  };

  if (mode === "variableSum") {
    return integrate(xLow, xHigh, (x) => densityAt(xLayer, x) * densityAt(yLayer, z - x));
  }

  if (mode === "variableProduct") {
    return integrate(xLow, xHigh, (x) => {
      if (Math.abs(x) < 1e-6) return 0;
      return densityAt(xLayer, x) * densityAt(yLayer, z / x) / Math.abs(x);
    });
  }

  if (mode === "variableRatio") {
    return integrate(yLow, yHigh, (y) => Math.abs(y) * densityAt(xLayer, z * y) * densityAt(yLayer, y));
  }

  if (mode === "fRatio") {
    const d1 = xLayer.key === "chisquared" ? xLayer.params.df : 1;
    const d2 = yLayer.key === "chisquared" ? yLayer.params.df : 1;
    return integrate(yLow, yHigh, (y) => {
      const x = z * d1 * y / d2;
      return Math.abs(y) * (d1 / d2) * densityAt(xLayer, x) * densityAt(yLayer, y);
    });
  }

  return 0;
}

function densityToCdf(points) {
  if (points.length < 2) return points;
  const cdf = [{ x: points[0].x, y: 0 }];
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    area += ((previous.y + current.y) * 0.5) * (current.x - previous.x);
    cdf.push({ x: current.x, y: area });
  }
  const total = cdf[cdf.length - 1].y || 1;
  return cdf.map((point) => ({ x: point.x, y: clamp(point.y / total, 0, 1) }));
}

function buildDerivedDensityPoints(mode, xLayer, yLayer, min, max) {
  if (!yLayer) return [];
  if (distributionSpecs[xLayer.key].type !== "continuous" || distributionSpecs[yLayer.key].type !== "continuous") return [];

  const points = [];
  const count = 130;
  for (let i = 0; i <= count; i += 1) {
    const x = min + (max - min) * (i / count);
    points.push({ x, y: derivedPdfValue(mode, xLayer, yLayer, x) });
  }
  return points;
}

function interpolatePoints(points, x) {
  if (!points.length) return 0;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].x >= x) {
      const left = points[i - 1];
      const right = points[i];
      const t = (x - left.x) / (right.x - left.x || 1);
      return left.y + (right.y - left.y) * t;
    }
  }
  return 0;
}

function integratePointInterval(points, from, to) {
  if (points.length < 2) return 0;
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  const clipped = points.filter((point) => point.x > a && point.x < b);
  const samples = [
    { x: a, y: interpolatePoints(points, a) },
    ...clipped,
    { x: b, y: interpolatePoints(points, b) },
  ].sort((left, right) => left.x - right.x);
  let area = 0;
  for (let i = 1; i < samples.length; i += 1) {
    area += ((samples[i - 1].y + samples[i].y) * 0.5) * (samples[i].x - samples[i - 1].x);
  }
  return clamp(area, 0, 1);
}

function combineSummary(mode, xLayer, yLayer) {
  const label = {
    densitySum: "curve-height sum",
    variableSum: "X + Y",
    variableProduct: "X * Y",
    variableRatio: "X / Y",
    fRatio: "(X / d1) / (Y / d2)",
    mixture: "weighted mixture",
    overlay: "overlay",
  }[mode] ?? mode;

  if (!derivedCombineModes.has(mode)) return label;
  if (!yLayer) return `${label}: save a Y distribution first.`;
  if (mode === "fRatio" && xLayer.key === "chisquared" && yLayer.key === "chisquared") {
    return `${label}: ${xLayer.label} df=${format(xLayer.params.df, 1)} with ${yLayer.label} df=${format(yLayer.params.df, 1)} gives F(${format(xLayer.params.df, 1)}, ${format(yLayer.params.df, 1)}).`;
  }
  return `${label}: numeric density from current X and saved Y.`;
}

function combinedDistributionInfo(mode, xLayer, yLayer) {
  const base = {
    name: xLayer.label,
    formula: "f_X(x)",
    detail: "The active distribution is shown without a derived variable operation.",
  };
  if (mode === "overlay") return { ...base, name: "Overlay comparison", formula: "f_X(x), f_Y(x)", detail: "Curves are drawn together for visual comparison." };
  if (mode === "mixture") return { name: "Weighted mixture", formula: "f_Z(z) = (w_X f_X(z) + w_Y f_Y(z)) / (w_X + w_Y)", detail: "Mixtures choose one source distribution by weight; they do not add random variables." };
  if (mode === "densitySum") return { name: "Curve-height sum", formula: "g(z) = f_X(z) + w_Y f_Y(z)", detail: "This adds plotted heights, so it is a visual algebra operation rather than a normalized probability distribution." };
  if (!yLayer) return { name: "Save Y to combine", formula: "Z = operation(X, Y)", detail: "Click Save Y after choosing a distribution, then edit X and Y independently." };

  if (mode === "fRatio" && xLayer.key === "chisquared" && yLayer.key === "chisquared") {
    return {
      name: `F(${format(xLayer.params.df, 1)}, ${format(yLayer.params.df, 1)}) distribution`,
      formula: "Z = (X / d1) / (Y / d2), where X ~ chi-square(d1), Y ~ chi-square(d2)",
      detail: "The plotted result uses the closed-form F density.",
    };
  }

  if (mode === "variableSum") {
    if (xLayer.key === "normal" && yLayer.key === "normal") {
      return {
        name: "Normal distribution",
        formula: "X + Y ~ Normal(mu_X + mu_Y, sqrt(sigma_X^2 + sigma_Y^2))",
        detail: "Independent normal variables add to another normal variable.",
      };
    }
    if (xLayer.key === "chisquared" && yLayer.key === "chisquared") {
      return {
        name: `Chi-Squared(${format(xLayer.params.df + yLayer.params.df, 1)}) distribution`,
        formula: "X + Y ~ chi-square(d1 + d2)",
        detail: "Independent chi-square variables add by degrees of freedom.",
      };
    }
    return { name: "Distribution of X + Y", formula: "f_Z(z) = integral f_X(x) f_Y(z - x) dx", detail: "The app computes this convolution numerically for continuous distributions." };
  }

  if (mode === "variableProduct") {
    return { name: "Distribution of X * Y", formula: "f_Z(z) = integral f_X(x) f_Y(z / x) (1 / |x|) dx", detail: "The product distribution uses a change-of-variables integral." };
  }

  if (mode === "variableRatio") {
    return { name: "Distribution of X / Y", formula: "f_Z(z) = integral |y| f_X(zy) f_Y(y) dy", detail: "The ratio distribution is computed numerically. Avoid intervals where Y is concentrated near zero." };
  }

  if (mode === "fRatio") {
    return { name: "Scaled ratio distribution", formula: "Z = (X / d1) / (Y / d2)", detail: "For chi-square X and Y this is exactly an F distribution; otherwise it is shown numerically." };
  }
  if (mode === "standardization") {
    return { name: "Standardized variable", formula: "Z = (X - mean) / standard deviation", detail: "Standardization recenters and rescales a variable so shape changes can be compared on a common axis." };
  }

  return base;
}

function drawDistribution() {
  clear();
  const key = distributionSelect.value;
  const spec = distributionSpecs[key];
  const params = distributionParamsValue();
  const rawMin = Number(document.querySelector("#distMin").value);
  const rawMax = Number(document.querySelector("#distMax").value);
  const xMin = Number.isFinite(rawMin) ? rawMin : spec.domain[0];
  const xMax = Number.isFinite(rawMax) ? rawMax : spec.domain[1];
  const min = Math.min(xMin, xMax - 0.001);
  const max = Math.max(xMax, xMin + 0.001);
  const area = canvasPlotArea();
  const isCdf = state.plotMode === "cdf";
  let points = buildDistributionPoints(key, params, min, max, isCdf);
  const combineMode = document.querySelector("#combineMode").value;
  let activeDensityPoints = buildDistributionPoints(key, params, min, max, false);
  let activeLayer = { key, label: spec.label, params, weight: 1 };
  const fDf1 = clamp(Math.round(Number(document.querySelector("#fDf1")?.value) || 5), 1, 100);
  const fDf2 = clamp(Math.round(Number(document.querySelector("#fDf2")?.value) || 12), 1, 100);
  let yLayer = state.distributionLayers[0];
  if (combineMode === "fRatio") {
    activeLayer = { key: "chisquared", label: "Chi-Squared X", params: { df: fDf1 }, weight: 1 };
    yLayer = { key: "chisquared", label: "Chi-Squared Y", params: { df: fDf2 }, weight: 1 };
    points = [];
    activeDensityPoints = [];
  }
  const resultInfo = combinedDistributionInfo(combineMode, activeLayer, yLayer);
  const derivedDensityPoints = derivedCombineModes.has(combineMode) ? buildDerivedDensityPoints(combineMode, activeLayer, yLayer, min, max) : [];
  const derivedPoints = isCdf ? densityToCdf(derivedDensityPoints) : derivedDensityPoints;
  const combinedPoints = combineMode === "overlay" || derivedCombineModes.has(combineMode) ? [] : buildCombinedPoints(activeLayer, state.distributionLayers, min, max, isCdf, combineMode);
  const relationshipLayers = combineMode === "fRatio" ? [activeLayer, yLayer] : state.distributionLayers;
  const layerPointSets = relationshipLayers.map((layer) => ({
    layer,
    spec: distributionSpecs[layer.key],
    points: buildDistributionPoints(layer.key, layer.params, min, max, isCdf),
  }));
  const combinedSpec = [activeLayer, ...relationshipLayers].every((layer) => distributionSpecs[layer.key].type === "discrete") ? spec : { type: "continuous" };
  const allPointSets = [points, combinedPoints, derivedPoints, ...layerPointSets.map((item) => item.points)];
  const yMax = isCdf ? Math.max(1, ...allPointSets.flat().map((point) => Number.isFinite(point.y) ? point.y : 0)) : Math.max(0.001, ...allPointSets.flat().map((point) => Number.isFinite(point.y) ? point.y : 0)) * 1.12;
  const intervalA = Number(document.querySelector("#intervalA").value);
  const intervalB = Number(document.querySelector("#intervalB").value);
  const from = Number.isFinite(intervalA) ? intervalA : min;
  const to = Number.isFinite(intervalB) ? intervalB : max;
  const probability = derivedDensityPoints.length ? integratePointInterval(derivedDensityPoints, from, to) : intervalProbability(key, params, from, to);
  document.querySelector("#intervalProbability").textContent = format(probability, 4);
  state.lastPlot = derivedPoints.length
    ? { area, min, max, key, params, isCdf, yMax, points: derivedPoints, label: resultInfo.name }
    : { area, min, max, key, params, isCdf, yMax };

  drawPlotAxes(area, min, max, yMax);

  layerPointSets.forEach((item) => {
    drawDistributionSeries(item.points, item.spec, area, min, max, yMax, colors.probe, 0.44);
  });

  if (combinedPoints.length) {
    drawDistributionSeries(combinedPoints, combinedSpec, area, min, max, yMax, colors.probe, 0.9);
  }

  if (derivedPoints.length) {
    drawDistributionSeries(derivedPoints, { type: "continuous" }, area, min, max, yMax, colors.probe, 0.95);
  }

  if (points.length) drawDistributionSeries(points, spec, area, min, max, yMax, isCdf ? colors.probe : colors.svd, 1);
  drawIntervalBand(derivedDensityPoints.length ? derivedDensityPoints : activeDensityPoints, { type: derivedDensityPoints.length ? "continuous" : spec.type }, area, min, max, yMax, from, to);

  ctx.save();
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  ctx.fillText(`${derivedPoints.length ? resultInfo.name : spec.label} ${isCdf ? "CDF" : spec.type === "discrete" ? "PMF" : "PDF"}`, area.left, area.top - 8);
  ctx.restore();
  document.querySelector("#distributionSummary").textContent = `${spec.label}: mean ${format(distributionStats(key, params).mean)}. ${distributionInsight(key, params)} Relationship: ${combineSummary(combineMode, activeLayer, yLayer)}.`;
  document.querySelector("#combinedName").textContent = resultInfo.name;
  document.querySelector("#combinedFormula").textContent = resultInfo.formula;
  document.querySelector("#combinedFormulaDetail").textContent = resultInfo.detail;
  document.querySelector("#fFamilyName").textContent = `F(${fDf1}, ${fDf2})`;
  document.querySelector("#fFamilyFormula").textContent = `(X / ${fDf1}) / (Y / ${fDf2}) ~ F(${fDf1}, ${fDf2})`;
  document.querySelector("#fFamilyDetail").textContent = combineMode === "fRatio"
    ? "The blue and violet overlays are the chi-squared inputs; the derived curve is the F-distribution ratio."
    : "Switch relationship mode to Derived family to compare two chi-squared inputs with the resulting F curve.";
}

function normalizeFunctionExpression(expression) {
  const trimmed = (expression || "x").trim();
  const aliases = {
    sinx: "sin(x)",
    cosx: "cos(x)",
    tanx: "tan(x)",
    sigmoid: "1 / (1 + exp(-x))",
    logistic: "1 / (1 + exp(-x))",
    tanh: "tanh(x)",
    relu: "max(0, x)",
    softplus: "log(1 + exp(x))",
    gaussian: "exp(-(x^2) / 2)",
  };
  return aliases[trimmed.toLowerCase()] || trimmed;
}

function compileFunctionExpression(expression) {
  const expanded = normalizeFunctionExpression(expression);
  const normalized = expanded
    .replace(/\bln\s*\(/gi, "log(")
    .replace(/\^/g, "**")
    .replace(/\bpi\b/gi, "PI");
  if (!/^[0-9xX+\-*/().,\s_a-zA-Z*]+$/.test(normalized)) {
    throw new Error("Unsupported characters");
  }
  const allowed = new Set(["x", "X", "y", "Y", "sin", "cos", "tan", "tanh", "asin", "acos", "atan", "sqrt", "abs", "exp", "log", "pow", "min", "max", "PI", "E"]);
  const tokens = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  if (tokens.some((token) => !allowed.has(token))) {
    throw new Error("Unsupported function");
  }
  return new Function("x", "y", `
    const {sin, cos, tan, tanh, asin, acos, atan, sqrt, abs, exp, log, pow, min, max, PI, E} = Math;
    const value = ${normalized.replace(/\bX\b/g, "x").replace(/\bY\b/g, "y")};
    return Number.isFinite(value) ? value : NaN;
  `);
}

function calculusFunction() {
  try {
    return compileFunctionExpression(document.querySelector("#functionInput").value || "x");
  } catch {
    return () => NaN;
  }
}

function derivativeAt(fn, x) {
  const h = Math.max(1e-4, Math.abs(x) * 1e-4);
  return (fn(x + h) - fn(x - h)) / (2 * h);
}

function integralBetween(fn, a, b) {
  const steps = 220;
  const h = (b - a) / steps;
  let area = 0;
  for (let i = 0; i < steps; i += 1) {
    const x1 = a + h * i;
    const x2 = x1 + h;
    const y1 = fn(x1);
    const y2 = fn(x2);
    if (Number.isFinite(y1) && Number.isFinite(y2)) area += (y1 + y2) * h * 0.5;
  }
  return area;
}

function derivativeTokens(expression) {
  const normalized = expression.replace(/\bln\s*\(/gi, "log(").replace(/\*\*/g, "^");
  const tokens = [];
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const number = normalized.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const name = normalized.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (name) {
      tokens.push({ type: "name", value: name[0] === "X" ? "x" : name[0] });
      index += name[0].length;
      continue;
    }
    if ("+-*/^(),".includes(char)) {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }
    throw new Error("Unsupported derivative token");
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function parseDerivativeExpression(expression) {
  const tokens = derivativeTokens(expression);
  let index = 0;
  const peek = () => tokens[index];
  const consume = (type) => {
    if (peek().type !== type) throw new Error(`Expected ${type}`);
    index += 1;
    return tokens[index - 1];
  };

  const parsePrimary = () => {
    const token = peek();
    if (token.type === "number") {
      consume("number");
      return { type: "num", value: token.value };
    }
    if (token.type === "name") {
      consume("name");
      if (peek().type === "(") {
        consume("(");
        const args = [parseAddSub()];
        while (peek().type === ",") {
          consume(",");
          args.push(parseAddSub());
        }
        consume(")");
        return { type: "call", name: token.value, args };
      }
      return token.value === "x" ? { type: "var" } : { type: "const", name: token.value };
    }
    if (token.type === "(") {
      consume("(");
      const node = parseAddSub();
      consume(")");
      return node;
    }
    throw new Error("Unsupported derivative expression");
  };

  const parseUnary = () => {
    if (peek().type === "+") {
      consume("+");
      return parseUnary();
    }
    if (peek().type === "-") {
      consume("-");
      return { type: "unary", op: "-", arg: parseUnary() };
    }
    return parsePrimary();
  };

  const parsePower = () => {
    const left = parseUnary();
    if (peek().type === "^") {
      consume("^");
      return { type: "bin", op: "^", left, right: parsePower() };
    }
    return left;
  };

  const parseMulDiv = () => {
    let node = parsePower();
    while (peek().type === "*" || peek().type === "/") {
      const op = consume(peek().type).type;
      node = { type: "bin", op, left: node, right: parsePower() };
    }
    return node;
  };

  const parseAddSub = () => {
    let node = parseMulDiv();
    while (peek().type === "+" || peek().type === "-") {
      const op = consume(peek().type).type;
      node = { type: "bin", op, left: node, right: parseMulDiv() };
    }
    return node;
  };

  const ast = parseAddSub();
  consume("eof");
  return ast;
}

function numNode(value) {
  return { type: "num", value };
}

function binNode(op, left, right) {
  return { type: "bin", op, left, right };
}

function callNode(name, args) {
  return { type: "call", name, args };
}

function derivativeAst(node) {
  switch (node.type) {
    case "num":
    case "const":
      return numNode(0);
    case "var":
      return numNode(1);
    case "unary":
      return { type: "unary", op: "-", arg: derivativeAst(node.arg) };
    case "bin": {
      const u = node.left;
      const v = node.right;
      const du = derivativeAst(u);
      const dv = derivativeAst(v);
      if (node.op === "+") return binNode("+", du, dv);
      if (node.op === "-") return binNode("-", du, dv);
      if (node.op === "*") return binNode("+", binNode("*", du, v), binNode("*", u, dv));
      if (node.op === "/") return binNode("/", binNode("-", binNode("*", du, v), binNode("*", u, dv)), binNode("^", v, numNode(2)));
      if (node.op === "^") {
        if (v.type === "num") return binNode("*", binNode("*", numNode(v.value), binNode("^", u, numNode(v.value - 1))), du);
        return binNode("*", binNode("^", u, v), binNode("+", binNode("*", dv, callNode("log", [u])), binNode("/", binNode("*", v, du), u)));
      }
      break;
    }
    case "call": {
      const arg = node.args[0];
      const dArg = derivativeAst(arg);
      if (node.name === "sin") return binNode("*", callNode("cos", [arg]), dArg);
      if (node.name === "cos") return binNode("*", { type: "unary", op: "-", arg: callNode("sin", [arg]) }, dArg);
      if (node.name === "tan") return binNode("*", binNode("/", numNode(1), binNode("^", callNode("cos", [arg]), numNode(2))), dArg);
      if (node.name === "tanh") return binNode("*", binNode("-", numNode(1), binNode("^", callNode("tanh", [arg]), numNode(2))), dArg);
      if (node.name === "asin") return binNode("*", binNode("/", numNode(1), callNode("sqrt", [binNode("-", numNode(1), binNode("^", arg, numNode(2)))])), dArg);
      if (node.name === "acos") return binNode("*", { type: "unary", op: "-", arg: binNode("/", numNode(1), callNode("sqrt", [binNode("-", numNode(1), binNode("^", arg, numNode(2)))])) }, dArg);
      if (node.name === "atan") return binNode("*", binNode("/", numNode(1), binNode("+", numNode(1), binNode("^", arg, numNode(2)))), dArg);
      if (node.name === "exp") return binNode("*", callNode("exp", [arg]), dArg);
      if (node.name === "log") return binNode("/", dArg, arg);
      if (node.name === "sqrt") return binNode("/", dArg, binNode("*", numNode(2), callNode("sqrt", [arg])));
      if (node.name === "pow" && node.args.length === 2) return derivativeAst(binNode("^", node.args[0], node.args[1]));
      break;
    }
    default:
      break;
  }
  throw new Error("Unsupported symbolic derivative");
}

function productFactors(node) {
  if (node.type === "bin" && node.op === "*") {
    return [...productFactors(node.left), ...productFactors(node.right)];
  }
  return [node];
}

function buildProduct(factors) {
  const numeric = factors
    .filter((factor) => factor.type === "num")
    .reduce((product, factor) => product * factor.value, 1);
  const symbolic = factors.filter((factor) => factor.type !== "num");
  if (Math.abs(numeric) < 1e-12) return numNode(0);
  const normalized = Math.abs(numeric - 1) < 1e-12 ? symbolic : [numNode(numeric), ...symbolic];
  if (!normalized.length) return numNode(1);
  return normalized.slice(1).reduce((left, right) => binNode("*", left, right), normalized[0]);
}

function simplifyAst(node) {
  if (node.type === "bin") {
    const left = simplifyAst(node.left);
    const right = simplifyAst(node.right);
    if (left.type === "num" && right.type === "num") {
      if (node.op === "+") return numNode(left.value + right.value);
      if (node.op === "-") return numNode(left.value - right.value);
      if (node.op === "*") return numNode(left.value * right.value);
      if (node.op === "/" && right.value !== 0) return numNode(left.value / right.value);
      if (node.op === "^") return numNode(left.value ** right.value);
    }
    if (node.op === "+" && left.type === "num" && left.value === 0) return right;
    if (node.op === "+" && right.type === "num" && right.value === 0) return left;
    if (node.op === "-" && right.type === "num" && right.value === 0) return left;
    if (node.op === "*" && ((left.type === "num" && left.value === 0) || (right.type === "num" && right.value === 0))) return numNode(0);
    if (node.op === "*" && left.type === "num" && left.value === 1) return right;
    if (node.op === "*" && right.type === "num" && right.value === 1) return left;
    if (node.op === "*") return buildProduct(productFactors(binNode("*", left, right)));
    if (node.op === "/" && left.type === "num" && left.value === 0) return numNode(0);
    if (node.op === "/" && right.type === "num" && right.value === 1) return left;
    if (node.op === "/" && right.type === "num" && right.value !== 0) {
      const factors = productFactors(left);
      const numeric = factors
        .filter((factor) => factor.type === "num")
        .reduce((product, factor) => product * factor.value, 1) / right.value;
      return buildProduct([numNode(numeric), ...factors.filter((factor) => factor.type !== "num")]);
    }
    if (node.op === "^" && right.type === "num" && right.value === 1) return left;
    if (node.op === "^" && right.type === "num" && right.value === 0) return numNode(1);
    return { ...node, left, right };
  }
  if (node.type === "unary") {
    const arg = simplifyAst(node.arg);
    if (arg.type === "num") return numNode(-arg.value);
    return { ...node, arg };
  }
  if (node.type === "call") {
    return { ...node, args: node.args.map(simplifyAst) };
  }
  return node;
}

function astPrecedence(node) {
  if (node.type === "bin") return { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 }[node.op];
  if (node.type === "unary") return 4;
  return 5;
}

function formatDerivativeNumber(value) {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value - Math.round(value)) < 1e-10) return String(Math.round(value));
  return String(Number(value.toFixed(4)));
}

function astToExpression(node, parentPrecedence = 0) {
  let text;
  if (node.type === "num") text = formatDerivativeNumber(node.value);
  else if (node.type === "var") text = "x";
  else if (node.type === "const") text = node.name;
  else if (node.type === "unary") text = `-${astToExpression(node.arg, astPrecedence(node))}`;
  else if (node.type === "call") text = `${node.name}(${node.args.map((arg) => astToExpression(arg)).join(", ")})`;
  else {
    const precedence = astPrecedence(node);
    if (node.op === "*" && node.left.type === "num" && node.left.value > 0 && node.left.value < 1) {
      const reciprocal = 1 / node.left.value;
      if (Math.abs(reciprocal - Math.round(reciprocal)) < 1e-10) {
        text = `${astToExpression(node.right, 2)} / ${Math.round(reciprocal)}`;
        return precedence < parentPrecedence ? `(${text})` : text;
      }
    }
    const left = astToExpression(node.left, precedence);
    const right = astToExpression(node.right, precedence + (node.op === "^" ? -1 : 0));
    text = `${left} ${node.op} ${right}`;
    if (precedence < parentPrecedence) text = `(${text})`;
  }
  return text;
}

function derivativeFormulaFor(expression) {
  const key = (expression || "x").trim().toLowerCase();
  const known = {
    "sin(x)": "d/dx sin(x) = cos(x)",
    sinx: "d/dx sin(x) = cos(x)",
    "cos(x)": "d/dx cos(x) = -sin(x)",
    cosx: "d/dx cos(x) = -sin(x)",
    "exp(x)": "d/dx exp(x) = exp(x)",
    "ln(x)": "d/dx ln(x) = 1 / x",
    sigmoid: "f'(x) = sigmoid(x)(1 - sigmoid(x))",
    logistic: "f'(x) = sigmoid(x)(1 - sigmoid(x))",
    tanh: "f'(x) = 1 - tanh(x)^2",
    relu: "f'(x) = 0 for x < 0, 1 for x > 0",
    softplus: "f'(x) = sigmoid(x)",
    gaussian: "f'(x) = -x exp(-x^2 / 2)",
  };
  if (known[key]) return known[key];
  try {
    const ast = parseDerivativeExpression(normalizeFunctionExpression(expression || "x"));
    const derivative = simplifyAst(derivativeAst(ast));
    return `f'(x) = ${astToExpression(derivative)}`;
  } catch {
    return "f'(x) uses the numeric slope shown above";
  }
}

function linearCoefficientOfX(node) {
  if (node.type === "var") return 1;
  if (node.type === "bin" && node.op === "*" && node.left.type === "num" && node.right.type === "var") return node.left.value;
  if (node.type === "bin" && node.op === "*" && node.right.type === "num" && node.left.type === "var") return node.right.value;
  if (node.type === "bin" && node.op === "/" && node.left.type === "var" && node.right.type === "num") return 1 / node.right.value;
  return null;
}

function integralAst(node) {
  switch (node.type) {
    case "num":
      return binNode("*", numNode(node.value), { type: "var" });
    case "var":
      return binNode("/", binNode("^", { type: "var" }, numNode(2)), numNode(2));
    case "unary":
      return { type: "unary", op: "-", arg: integralAst(node.arg) };
    case "bin": {
      if (node.op === "+") return binNode("+", integralAst(node.left), integralAst(node.right));
      if (node.op === "-") return binNode("-", integralAst(node.left), integralAst(node.right));
      if (node.op === "*" && node.left.type === "num") return binNode("*", node.left, integralAst(node.right));
      if (node.op === "*" && node.right.type === "num") return binNode("*", node.right, integralAst(node.left));
      if (node.op === "/" && node.right.type === "num") return binNode("/", integralAst(node.left), node.right);
      if (node.op === "^" && node.left.type === "var" && node.right.type === "num" && Math.abs(node.right.value + 1) > 1e-10) {
        const nextPower = node.right.value + 1;
        return binNode("/", binNode("^", { type: "var" }, numNode(nextPower)), numNode(nextPower));
      }
      break;
    }
    case "call": {
      const arg = node.args[0];
      const k = linearCoefficientOfX(arg);
      if (node.name === "sin" && k) return binNode("/", { type: "unary", op: "-", arg: callNode("cos", [arg]) }, numNode(k));
      if (node.name === "cos" && k) return binNode("/", callNode("sin", [arg]), numNode(k));
      if (node.name === "exp" && k) return binNode("/", callNode("exp", [arg]), numNode(k));
      if (node.name === "tanh" && k) return binNode("/", callNode("log", [callNode("cosh", [arg])]), numNode(k));
      break;
    }
    default:
      break;
  }
  throw new Error("No elementary antiderivative");
}

function antiderivativeFormulaFor(expression) {
  const normalized = normalizeFunctionExpression(expression || "x").replace(/\s+/g, "");
  const known = {
    x: "Integral f(x) dx = x^2 / 2 + C",
    "x^2": "Integral f(x) dx = x^3 / 3 + C",
    "x^3": "Integral f(x) dx = x^4 / 4 + C",
    "sin(x)": "Integral f(x) dx = -cos(x) + C",
    "cos(x)": "Integral f(x) dx = sin(x) + C",
    "exp(x)": "Integral f(x) dx = exp(x) + C",
    "exp(x/3)": "Integral f(x) dx = 3 exp(x / 3) + C",
    "ln(x+4)": "Integral f(x) dx = (x + 4) ln(x + 4) - (x + 4) + C",
    "1/(1+x^2)": "Integral f(x) dx = atan(x) + C",
    "1/(1+exp(-x))": "Integral f(x) dx = log(1 + exp(x)) + C",
    "tanh(x)": "Integral f(x) dx = log(cosh(x)) + C",
    "max(0,x)": "Integral f(x) dx = 0.5 * max(0, x)^2 + C",
    "log(1+exp(x))": "No simple closed-form antiderivative",
    "exp(-(x^2)/2)": "No elementary closed-form antiderivative",
  };
  if (known[normalized]) return known[normalized];
  try {
    const ast = parseDerivativeExpression(normalizeFunctionExpression(expression || "x"));
    const integral = simplifyAst(integralAst(ast));
    return `Integral f(x) dx = ${astToExpression(integral)} + C`;
  } catch {
    return "No simple closed-form antiderivative";
  }
}

function partialDerivativeAt(fn, x, y, axis) {
  const h = Math.max(1e-4, Math.abs(axis === "x" ? x : y) * 1e-4);
  if (axis === "x") return (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  return (fn(x, y + h) - fn(x, y - h)) / (2 * h);
}

function detectOneDCriticalPoints(fn, min, max) {
  const stationary = [];
  const inflections = [];
  const samples = 96;
  let lastDerivative = null;
  let lastSecond = null;
  let lastX = min;
  for (let i = 0; i <= samples; i += 1) {
    const x = min + (max - min) * (i / samples);
    const first = derivativeAt(fn, x);
    const h = Math.max(1e-3, Math.abs(x) * 1e-3);
    const second = (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h);
    if (Number.isFinite(first) && Number.isFinite(lastDerivative) && Math.sign(first) !== Math.sign(lastDerivative)) {
      stationary.push((x + lastX) / 2);
    }
    if (Number.isFinite(second) && Number.isFinite(lastSecond) && Math.sign(second) !== Math.sign(lastSecond)) {
      inflections.push((x + lastX) / 2);
    }
    lastDerivative = first;
    lastSecond = second;
    lastX = x;
  }
  return {
    stationary: stationary.slice(0, 4),
    inflections: inflections.slice(0, 4),
  };
}

function projectSurfacePoint(point, area, zScale = 0.72) {
  const [x, y, z] = point;
  const yaw = state.surfaceOrbit.yaw;
  const pitch = state.surfaceOrbit.pitch;
  const roll = state.surfaceOrbit.roll;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const rz = z * zScale;
  const x1 = x * cy - y * sy;
  const y1 = x * sy + y * cy;
  const z1 = rz;
  const x2 = x1;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const rx = x2 * cr + z2 * sr;
  const py = y2;
  const depth = -x2 * sr + z2 * cr;
  const scale = Math.min(area.width, area.height) / 6.65;
  return {
    x: area.left + area.width / 2 + rx * scale,
    y: area.top + area.height / 2 + 24 - py * scale,
    depth,
  };
}

function drawSurfaceLine(points, color, alpha = 1, width = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

function surfaceColor(t, alpha = 0.55) {
  const hue = 194 + t * 88;
  const light = 46 + t * 16;
  return `hsla(${hue}, 86%, ${light}%, ${alpha})`;
}

function drawSurfacePolygon(points, fill, stroke, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSurfaceArrow(from, to, color, label = "") {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = 9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.shadowBlur = 0;
    ctx.font = "700 12px Space Mono, Consolas, monospace";
    ctx.fillText(label, to.x + 8, to.y - 8);
  }
  ctx.restore();
}

function drawSurfaceGradientFlow(fn, min, max, range, toScene, normalizeZ, area) {
  if (!state.showGradientFlow) return;
  const points = [];
  const count = state.flowDensity;
  for (let i = 1; i < count; i += 1) {
    const x = min + (range * i) / count;
    for (let j = 1; j < count; j += 1) {
      const y = min + (range * j) / count;
      const z = fn(x, y);
      const fx = partialDerivativeAt(fn, x, y, "x");
      const fy = partialDerivativeAt(fn, x, y, "y");
      const magnitude = Math.hypot(fx, fy);
      if (!Number.isFinite(z) || !Number.isFinite(magnitude) || magnitude < 0.04) continue;
      const step = (range * state.gradientReach) / Math.max(0.35, magnitude);
      const from = projectSurfacePoint([toScene(x), toScene(y), normalizeZ(z) + 0.06], area);
      const to = projectSurfacePoint([toScene(x + fx * step), toScene(y + fy * step), normalizeZ(z) + 0.06], area);
      points.push({ from, to, magnitude });
    }
  }

  ctx.save();
  points.forEach((point, index) => {
    const pulse = 0.36 + 0.18 * Math.sin((state.flowPhase * Math.PI * 2) + index * 0.65);
    const color = `rgba(72, 224, 164, ${pulse})`;
    const angle = Math.atan2(point.to.y - point.from.y, point.to.x - point.from.x);
    const head = 6;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(point.from.x, point.from.y);
    ctx.lineTo(point.to.x, point.to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.to.x, point.to.y);
    ctx.lineTo(point.to.x - head * Math.cos(angle - Math.PI / 6), point.to.y - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(point.to.x - head * Math.cos(angle + Math.PI / 6), point.to.y - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function drawSurfaceCalculus() {
  clear();
  const fn = calculusFunction();
  const expression = document.querySelector("#functionInput").value || "x^2 + y^2";
  const rawMin = Number(document.querySelector("#calcMin").value);
  const rawMax = Number(document.querySelector("#calcMax").value);
  const min = Number.isFinite(rawMin) ? rawMin : -4;
  const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : min + 8;
  const range = Math.max(1, max - min);
  const center = (min + max) / 2;
  const sceneSpan = 5.9;
  const toScene = (value) => ((value - center) / range) * sceneSpan;
  const area = canvasPlotArea();
  const grid = 34;
  const samples = [];
  let zMin = Infinity;
  let zMax = -Infinity;

  for (let i = 0; i <= grid; i += 1) {
    const row = [];
    const x = min + range * (i / grid);
    for (let j = 0; j <= grid; j += 1) {
      const y = min + range * (j / grid);
      const z = fn(x, y);
      if (Number.isFinite(z)) {
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
      }
      row.push({ x, y, z: Number.isFinite(z) ? z : NaN });
    }
    samples.push(row);
  }

  if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) {
    document.querySelector("#calculusInterpretation").textContent = "The expression is not finite on this domain. Adjust the function or range.";
    return;
  }

  const zMid = (zMin + zMax) / 2;
  const zSpan = Math.max(1e-6, zMax - zMin);
  const normalizeZ = (z) => clamp(((z - zMid) / zSpan) * 3.7, -2.45, 2.45);
  const projected = samples.map((row) => row.map((point) => ({
    ...point,
    sceneX: toScene(point.x),
    sceneY: toScene(point.y),
    sceneZ: normalizeZ(point.z),
    screen: projectSurfacePoint([toScene(point.x), toScene(point.y), normalizeZ(point.z)], area),
  })));

  const floorCorners = [
    projectSurfacePoint([toScene(min), toScene(min), -2.5], area),
    projectSurfacePoint([toScene(max), toScene(min), -2.5], area),
    projectSurfacePoint([toScene(max), toScene(max), -2.5], area),
    projectSurfacePoint([toScene(min), toScene(max), -2.5], area),
  ];
  drawSurfacePolygon(floorCorners, "rgba(86, 167, 255, 0.045)", "rgba(143, 160, 181, 0.22)", 1);

  for (let i = 0; i <= 8; i += 1) {
    const value = min + (range * i) / 8;
    drawSurfaceLine([
      projectSurfacePoint([toScene(value), toScene(min), -2.46], area),
      projectSurfacePoint([toScene(value), toScene(max), -2.46], area),
    ], colors.grid, 0.18, 0.65);
    drawSurfaceLine([
      projectSurfacePoint([toScene(min), toScene(value), -2.46], area),
      projectSurfacePoint([toScene(max), toScene(value), -2.46], area),
    ], colors.grid, 0.18, 0.65);
  }

  const cells = [];
  for (let i = 0; i < grid; i += 1) {
    for (let j = 0; j < grid; j += 1) {
      const corners = [projected[i][j], projected[i + 1][j], projected[i + 1][j + 1], projected[i][j + 1]];
      if (corners.every((point) => Number.isFinite(point.z))) {
        const avgZ = corners.reduce((sum, point) => sum + point.z, 0) / 4;
        const avgDepth = corners.reduce((sum, point) => sum + point.screen.depth, 0) / 4;
        cells.push({ corners, avgZ, avgDepth });
      }
    }
  }

  cells.sort((a, b) => a.avgDepth - b.avgDepth);
  cells.forEach((cell) => {
    const t = clamp((cell.avgZ - zMin) / zSpan, 0, 1);
    drawSurfacePolygon(
      cell.corners.map((point) => point.screen),
      surfaceColor(t, 0.5),
      "rgba(210, 230, 255, 0.1)",
      0.92
    );
  });

  for (let i = 0; i <= grid; i += 4) {
    drawSurfaceLine(projected[i].map((point) => point.screen), "rgba(230, 240, 255, 0.18)", 1, 0.8);
    drawSurfaceLine(projected.map((row) => row[i].screen), "rgba(230, 240, 255, 0.18)", 1, 0.8);
  }

  const xAxisFrom = projectSurfacePoint([toScene(min), 0, -2.42], area);
  const xAxisTo = projectSurfacePoint([toScene(max), 0, -2.42], area);
  const yAxisFrom = projectSurfacePoint([0, toScene(min), -2.42], area);
  const yAxisTo = projectSurfacePoint([0, toScene(max), -2.42], area);
  const zAxisFrom = projectSurfacePoint([0, 0, -2.5], area);
  const zAxisTo = projectSurfacePoint([0, 0, 2.7], area);
  drawSurfaceArrow(xAxisFrom, xAxisTo, colors.i, "x");
  drawSurfaceArrow(yAxisFrom, yAxisTo, colors.j, "y");
  drawSurfaceArrow(zAxisFrom, zAxisTo, colors.k, "z");
  drawSurfaceGradientFlow(fn, min, max, range, toScene, normalizeZ, area);

  const x0 = Number(document.querySelector("#surfaceX").value) || 0;
  const y0 = Number(document.querySelector("#surfaceY").value) || 0;
  const z0 = fn(x0, y0);
  const fx = partialDerivativeAt(fn, x0, y0, "x");
  const fy = partialDerivativeAt(fn, x0, y0, "y");
  const probe = projectSurfacePoint([toScene(x0), toScene(y0), normalizeZ(z0)], area);

  if (Number.isFinite(z0)) {
    ctx.save();
    ctx.fillStyle = colors.transformed;
    ctx.shadowColor = colors.transformed;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(probe.x, probe.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (state.calculusMode === "gradient" && Number.isFinite(z0) && Number.isFinite(fx) && Number.isFinite(fy)) {
    const planePoints = [];
    [-1, 1].forEach((dx) => {
      [-1, 1].forEach((dy) => {
        const px = x0 + dx * range * 0.14;
        const py = y0 + dy * range * 0.14;
        const pz = z0 + fx * (px - x0) + fy * (py - y0);
        planePoints.push(projectSurfacePoint([toScene(px), toScene(py), normalizeZ(pz)], area));
      });
    });
    ctx.save();
    ctx.fillStyle = "rgba(0, 212, 255, 0.16)";
    ctx.strokeStyle = "rgba(0, 212, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    [planePoints[0], planePoints[1], planePoints[3], planePoints[2]].forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (Number.isFinite(z0) && Number.isFinite(fx) && Number.isFinite(fy)) {
    const gradientScale = range * 0.12 / Math.max(0.4, Math.hypot(fx, fy));
    const gradientEnd = projectSurfacePoint([
      toScene(x0 + fx * gradientScale),
      toScene(y0 + fy * gradientScale),
      normalizeZ(z0),
    ], area);
    drawSurfaceArrow(probe, gradientEnd, colors.j, "grad");
  }

  const gradientMagnitude = Math.hypot(fx, fy);
  document.querySelector("#derivativeValue").textContent = Number.isFinite(fx) ? `fx ${format(fx, 3)}` : "n/a";
  document.querySelector("#gradientValue").textContent = Number.isFinite(gradientMagnitude) ? `|grad| ${format(gradientMagnitude, 3)}` : "n/a";
  document.querySelector("#derivativeFormula").textContent = `Partial derivatives: fx = ${format(fx, 4)}, fy = ${format(fy, 4)}`;
  document.querySelector("#antiderivativeFormula").textContent = "Surface mode uses numerical partial derivatives and local linearization.";
  document.querySelector("#tangentPlaneFormula").textContent = Number.isFinite(z0) && Number.isFinite(fx) && Number.isFinite(fy)
    ? `z ≈ ${format(z0, 3)} + ${format(fx, 3)}(x - ${format(x0, 2)}) + ${format(fy, 3)}(y - ${format(y0, 2)})`
    : "Tangent plane unavailable on this domain.";
  document.querySelector("#criticalSummary").textContent = Number.isFinite(gradientMagnitude)
    ? gradientMagnitude < 0.02 ? "The probe is nearly stationary: the local surface is flat." : `Steepest ascent points along <${format(fx, 2)}, ${format(fy, 2)}>.`
    : "Gradient unavailable for this expression at the probe.";
  document.querySelector("#derivativeSummary").textContent = Number.isFinite(gradientMagnitude)
    ? `At (${format(x0, 2)}, ${format(y0, 2)}), fx and fy measure local change along the x and y directions.`
    : "Partial derivatives are unavailable at this probe.";
  document.querySelector("#calculusInterpretation").textContent = Number.isFinite(gradientMagnitude)
    ? `At (${format(x0, 2)}, ${format(y0, 2)}), z = ${format(z0, 3)}. The gradient shows the fastest local increase across the surface.`
    : "The expression is outside its real-valued domain at the probe point.";
  document.querySelector("#integralValue").textContent = "surface";
  document.querySelector("#integralSummary").textContent = "Color encodes height; the mesh shows the surface geometry and the plane is the local linear approximation.";
  document.querySelector("#classification").textContent = `${state.calculusMode === "gradient" ? "Tangent plane" : "Surface"} calculus for z = ${expression}`;
  ctx.save();
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  ctx.fillText(`z = ${expression}`, area.left, area.top - 8);
  ctx.restore();
}

function drawCalculus() {
  clear();
  if (state.calculusMode !== "oneD") {
    drawSurfaceCalculus();
    return;
  }
  const rawFn = calculusFunction();
  const fn = (x) => rawFn(x, 0);
  const expression = document.querySelector("#functionInput").value || "x";
  const rawMin = Number(document.querySelector("#calcMin").value);
  const rawMax = Number(document.querySelector("#calcMax").value);
  const min = Number.isFinite(rawMin) ? rawMin : -5;
  const max = Number.isFinite(rawMax) && rawMax > min ? rawMax : min + 10;
  const area = canvasPlotArea();
  const samples = [];
  const derivativeSamples = [];
  for (let i = 0; i <= 360; i += 1) {
    const x = min + (max - min) * (i / 360);
    const y = fn(x);
    if (Number.isFinite(y)) samples.push({ x, y });
    const derivative = derivativeAt(fn, x);
    if (Number.isFinite(derivative)) derivativeSamples.push({ x, y: derivative });
  }
  const yValues = samples.map((point) => point.y);
  const yMin = Math.min(-1, ...yValues);
  const yMax = Math.max(1, ...yValues);
  const yPad = (yMax - yMin) * 0.12 || 1;
  const low = yMin - yPad;
  const high = yMax + yPad;
  const xToScreen = (x) => area.left + ((x - min) / (max - min)) * area.width;
  const yToScreen = (y) => area.bottom - ((y - low) / (high - low)) * area.height;

  drawFunctionAxes(area, min, max, low, high);
  ctx.save();

  const a = Number(document.querySelector("#integralA").value);
  const b = Number(document.querySelector("#integralB").value);
  const from = Number.isFinite(a) ? a : 0;
  const to = Number.isFinite(b) ? b : 1;
  const shadeStart = Math.max(min, Math.min(from, to));
  const shadeEnd = Math.min(max, Math.max(from, to));
  const shaded = samples.filter((point) => point.x >= shadeStart && point.x <= shadeEnd);
  if (shaded.length > 1) {
    ctx.fillStyle = "rgba(255, 107, 97, 0.28)";
    ctx.beginPath();
    ctx.moveTo(xToScreen(shaded[0].x), yToScreen(0));
    shaded.forEach((point) => ctx.lineTo(xToScreen(point.x), yToScreen(point.y)));
    ctx.lineTo(xToScreen(shaded[shaded.length - 1].x), yToScreen(0));
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = colors.svd;
  ctx.lineWidth = 3.1;
  ctx.shadowColor = colors.svd;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  samples.forEach((point, index) => {
    const x = xToScreen(point.x);
    const y = yToScreen(point.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;
  drawDerivativeFlow(samples, derivativeSamples, area, min, max, low, high);

  const x0Input = document.querySelector("#derivativeX");
  x0Input.min = String(min);
  x0Input.max = String(max);
  const x0 = clamp(Number(x0Input.value), min, max);
  x0Input.value = String(x0);
  const y0 = fn(x0);
  const slope = derivativeAt(fn, x0);
  let slopeText = "n/a";
  if (Number.isFinite(y0) && Number.isFinite(slope)) {
    slopeText = format(slope, 4);
    const dx = (max - min) * 0.12;
    const p1 = [xToScreen(x0 - dx), yToScreen(y0 - slope * dx)];
    const p2 = [xToScreen(x0 + dx), yToScreen(y0 + slope * dx)];
    ctx.strokeStyle = colors.probe;
    ctx.lineWidth = 2.6;
    ctx.shadowColor = colors.probe;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.fillStyle = colors.probe;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(xToScreen(x0), yToScreen(y0), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const integral = integralBetween(fn, from, to);
  const critical = detectOneDCriticalPoints(fn, min, max);
  const direction = Number.isFinite(slope) ? slope > 0.02 ? "increasing" : slope < -0.02 ? "decreasing" : "locally flat" : "outside the supported domain";
  document.querySelector("#derivativeValue").textContent = slopeText;
  document.querySelector("#derivativeFormula").textContent = derivativeFormulaFor(expression);
  document.querySelector("#antiderivativeFormula").textContent = antiderivativeFormulaFor(expression);
  document.querySelector("#gradientValue").textContent = "1D";
  document.querySelector("#tangentPlaneFormula").textContent = Number.isFinite(y0) && Number.isFinite(slope)
    ? `Tangent: y = ${format(y0, 3)} + ${format(slope, 3)}(x - ${format(x0, 2)})`
    : "Tangent line unavailable at this point.";
  document.querySelector("#criticalSummary").textContent = `Stationary: ${critical.stationary.length ? critical.stationary.map((x) => format(x, 2)).join(", ") : "none detected"}. Inflection: ${critical.inflections.length ? critical.inflections.map((x) => format(x, 2)).join(", ") : "none detected"}.`;
  document.querySelector("#integralValue").textContent = format(integral, 4);
  document.querySelector("#derivativeSummary").textContent = `At x = ${format(x0, 3)}, f'(x) is the tangent slope.`;
  document.querySelector("#integralSummary").textContent = `Integral from ${format(from, 2)} to ${format(to, 2)} is signed area.`;
  document.querySelector("#calculusInterpretation").textContent = `The graph is ${direction} at x = ${format(x0, 2)}. The shaded region is accumulated signed area over the selected interval.`;
  document.querySelector("#classification").textContent = `Calculus visualizer for f(x) = ${expression}`;
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  ctx.fillText(`f(x) = ${expression}`, area.left, area.top - 8);
  ctx.restore();
}

function draw() {
  clear();
  if (state.activeMode === "distribution") {
    drawDistribution();
    return;
  }
  if (state.activeMode === "calculus") {
    drawCalculus();
    return;
  }

  if (state.dimension === 3) {
    draw3DTransform(currentMatrix3());
    return;
  }

  const matrix = currentMatrix();
  drawGrid(matrix);

  if (toggles.circle.checked) {
    drawPolyline(unitCirclePoints([1, 0, 0, 1]), colors.original, 1.2, true, 0.45);
    drawPolyline(unitCirclePoints(matrix), colors.transformed, 2.2, true, 0.9);
  }

  if (toggles.square.checked) {
    drawPolyline(unitSquarePoints([1, 0, 0, 1]), colors.original, 1.3, true, 0.5);
    drawPolyline(unitSquarePoints(matrix), colors.transformed, 2.3, true, 0.95);
  }

  if (toggles.eigen.checked && state.activeMode !== "eigen") drawEigenLines(matrix);

  if (toggles.points.checked) {
    samplePoints.forEach((point) => {
      drawPoint(point, colors.original, 2.4);
      drawPoint(applyMatrix(matrix, point), colors.transformed, 3.2);
    });
  }

  if (toggles.basis.checked) {
    drawArrow([0, 0], applyMatrix(matrix, [1, 0]), colors.i, basisLabels.i);
    drawArrow([0, 0], applyMatrix(matrix, [0, 1]), colors.j, basisLabels.j);
  }

  drawDecompositionMode(matrix);
  drawProbe(matrix);
}

function classify(matrix) {
  const [a, b, c, d] = matrix;
  const det = a * d - b * c;
  const tr = a + d;
  const singular = Math.abs(det) < 1e-6;
  const orthogonal =
    Math.abs(a * a + c * c - 1) < 0.02 &&
    Math.abs(b * b + d * d - 1) < 0.02 &&
    Math.abs(a * b + c * d) < 0.02;

  if (Math.abs(a - 1) < 1e-6 && Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6 && Math.abs(d - 1) < 1e-6) return "Identity transformation";
  if (singular) return "Singular transformation with dimension collapse";
  if (orthogonal && det > 0) return "Rotation or rigid orientation-preserving transform";
  if (orthogonal && det < 0) return "Reflection or rigid orientation-reversing transform";
  if (det < 0) return "Orientation-reversing transformation";
  if (tr * tr - 4 * det < 0) return "Rotation with scaling";
  return "Orientation-preserving stretch, shear, or scale";
}

function updateReadouts(matrix) {
  if (state.activeMode === "distribution") {
    updateDistributionReadouts();
    return;
  }
  if (state.activeMode === "calculus") {
    document.querySelector("#readoutLabel1").textContent = "view";
    document.querySelector("#readoutLabel2").textContent = "function";
    document.querySelector("#readoutLabel3").textContent = state.calculusMode === "oneD" ? "x0" : "probe";
    document.querySelector("#readoutLabel4").textContent = state.calculusMode === "oneD" ? "derivative" : "gradient";
    document.querySelector("#readoutLabel5").textContent = state.calculusMode === "oneD" ? "integral" : "tangent";
    document.querySelector("#readoutLabel6").textContent = "domain";
    document.querySelector("#detValue").textContent = state.calculusMode === "oneD" ? "1D" : state.calculusMode === "surface" ? "surface" : "tangent plane";
    document.querySelector("#traceValue").textContent = document.querySelector("#functionInput")?.value || "f(x)";
    document.querySelector("#rankValue").textContent = state.calculusMode === "oneD"
      ? document.querySelector("#derivativeX")?.value || "0"
      : `(${document.querySelector("#surfaceX")?.value || "0"}, ${document.querySelector("#surfaceY")?.value || "0"})`;
    document.querySelector("#orientationValue").textContent = state.calculusMode === "oneD"
      ? document.querySelector("#derivativeValue")?.textContent || "0"
      : document.querySelector("#gradientValue")?.textContent || "n/a";
    document.querySelector("#eigenValue").textContent = state.calculusMode === "oneD"
      ? `${document.querySelector("#integralA")?.value || "0"}..${document.querySelector("#integralB")?.value || "1"} = ${document.querySelector("#integralValue")?.textContent || "0"}`
      : document.querySelector("#tangentPlaneFormula")?.textContent || "local plane";
    document.querySelector("#singularValue").textContent = `${document.querySelector("#calcMin")?.value || "-5"}..${document.querySelector("#calcMax")?.value || "5"}`;
    return;
  }
  if (state.dimension === 3) {
    const matrix3 = currentMatrix3();
    resetMatrixReadoutLabels();
    document.querySelector("#readoutLabel1").textContent = "det(A)";
    document.querySelector("#readoutLabel2").textContent = "dimension";
    document.querySelector("#readoutLabel3").textContent = "basis";
    document.querySelector("#readoutLabel4").textContent = "orientation";
    document.querySelector("#readoutLabel5").textContent = "i, j, k";
    document.querySelector("#readoutLabel6").textContent = "view";
    const det = determinant3(matrix3);
    document.querySelector("#detValue").textContent = format(det);
    document.querySelector("#traceValue").textContent = "3D";
    document.querySelector("#rankValue").textContent = `${basisLabels.i}, ${basisLabels.j}, ${basisLabels.k}`;
    document.querySelector("#orientationValue").textContent = det < -1e-6 ? "reversed" : det > 1e-6 ? "preserved" : "collapsed";
    document.querySelector("#eigenValue").textContent = `${basisLabels.i}, ${basisLabels.j}, ${basisLabels.k}`;
    document.querySelector("#singularValue").textContent = "isometric";
    document.querySelector("#classification").textContent = "3D linear transformation";
    document.querySelector("#mixOutput").textContent = `${Math.round(state.mix * 100)}%`;
    return;
  }

  resetMatrixReadoutLabels();
  const [a, b, c, d] = matrix;
  const det = a * d - b * c;
  const tr = a + d;
  const rank = Math.abs(det) > 1e-6 ? 2 : (Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d) > 1e-6 ? 1 : 0);
  const eigen = eigenData(matrix);
  const svd = svdData(matrix);
  const eigendecomp = eigendecompositionData(matrix);
  document.querySelector("#detValue").textContent = format(det);
  document.querySelector("#traceValue").textContent = format(tr);
  document.querySelector("#rankValue").textContent = String(rank);
  document.querySelector("#orientationValue").textContent = det < -1e-6 ? "reversed" : det > 1e-6 ? "preserved" : "collapsed";
  document.querySelector("#eigenValue").textContent = eigen.valuesText;
  document.querySelector("#singularValue").textContent = svd.values.map((value) => format(value)).join(", ");
  document.querySelector("#classification").textContent = classify(matrix);
  document.querySelector("#mixOutput").textContent = `${Math.round(state.mix * 100)}%`;
  document.querySelector("#uMatrix").textContent = formatMatrix(svd.u);
  document.querySelector("#sigmaMatrix").textContent = formatMatrix(svd.sigma);
  document.querySelector("#vtMatrix").textContent = formatMatrix(svd.vt);
  document.querySelector("#pdpMatrix").textContent = eigendecomp.diagonalizable ? `${formatMatrix(eigendecomp.p)} D ${formatMatrix(eigendecomp.pinv)}` : "not real diagonalizable";
  updateMatrixInsight(matrix, det, tr, rank, eigen, svd);
  updateDecompositionSummary(svd, eigendecomp);
}

function updateDistributionReadouts() {
  const key = distributionSelect.value;
  const spec = distributionSpecs[key];
  const params = distributionParamsValue();
  const stats = distributionStats(key, params);
  const mode = state.plotMode === "cdf" ? "CDF" : spec.type === "discrete" ? "PMF" : "PDF";

  document.querySelector("#readoutLabel1").textContent = "distribution";
  document.querySelector("#readoutLabel2").textContent = "type";
  document.querySelector("#readoutLabel3").textContent = "mean";
  document.querySelector("#readoutLabel4").textContent = "variance";
  document.querySelector("#readoutLabel5").textContent = "support";
  document.querySelector("#readoutLabel6").textContent = "plot";
  document.querySelector("#detValue").textContent = spec.label;
  document.querySelector("#traceValue").textContent = spec.type;
  document.querySelector("#rankValue").textContent = format(stats.mean);
  document.querySelector("#orientationValue").textContent = format(stats.variance);
  document.querySelector("#eigenValue").textContent = stats.support;
  document.querySelector("#singularValue").textContent = mode;
  document.querySelector("#classification").textContent = `${spec.label} distribution visualizer`;
  document.querySelector("#distributionSummary").textContent = `${spec.label}: mean ${format(stats.mean)}, variance ${format(stats.variance)}, support ${stats.support}. ${distributionInsight(key, params)}`;
}

function resetMatrixReadoutLabels() {
  document.querySelector("#readoutLabel1").textContent = "det(A)";
  document.querySelector("#readoutLabel2").textContent = "trace(A)";
  document.querySelector("#readoutLabel3").textContent = "rank";
  document.querySelector("#readoutLabel4").textContent = "orientation";
  document.querySelector("#readoutLabel5").textContent = "eigenvalues";
  document.querySelector("#readoutLabel6").textContent = "singular values";
}

function updateDecompositionSummary(svd, eigendecomp) {
  const summary = document.querySelector("#decompSummary");
  const modeCopy = {
    transform: {
      title: "Transform",
      body: "Directly compare source geometry with A applied to every point.",
    },
    svd: {
      title: "Matrix Analysis: SVD",
      body: `Singular values ${format(svd.values[0])} and ${format(svd.values[1])} show the strongest and weakest stretch directions.`,
    },
    eigen: {
      title: "Eigenvalue Geometry",
      body: eigendecomp.status,
    },
  };
  const copy = modeCopy[state.activeMode];
  summary.querySelector("strong").textContent = copy.title;
  summary.querySelector("p").textContent = copy.body;
}

function updateMatrixInsight(matrix, det, tr, rank, eigen, svd) {
  const detFormula = document.querySelector("#detFormula");
  if (!detFormula) return;
  const [a, b, c, d] = matrix;
  const disc = tr * tr - 4 * det;
  const invertible = Math.abs(det) > 1e-8;
  const orientation = det < -1e-8 ? "reverses orientation" : det > 1e-8 ? "preserves orientation" : "collapses area";
  const conditioning = svd.values[1] > 1e-8 ? svd.values[0] / svd.values[1] : Infinity;
  document.querySelector("#invertibilitySummary").textContent = invertible ? "invertible" : "singular";
  detFormula.textContent = `det(A) = (${format(a, 2)})(${format(d, 2)}) - (${format(b, 2)})(${format(c, 2)}) = ${format(det, 4)}`;
  document.querySelector("#eigenFormula").textContent = disc < -1e-9
    ? `eigenvalues: ${eigen.valuesText}`
    : `eigenvalues: ${eigen.valuesText}; trace ${format(tr, 3)}, rank ${rank}`;
  document.querySelector("#matrixInsight").textContent = invertible
    ? `A ${orientation}. Area scales by |det(A)| = ${format(Math.abs(det), 3)}; conditioning is ${Number.isFinite(conditioning) ? format(conditioning, 2) : "infinite"}.`
    : "A is singular, so at least one dimension collapses and the inverse does not exist.";
}

function update() {
  if (state.activeMode === "calculus") {
    draw();
    updateReadouts(currentMatrix());
    return;
  }
  const matrix = currentMatrix();
  updateReadouts(matrix);
  draw();
}

function renderDistributionParams(resetDomain = false) {
  const spec = distributionSpecs[distributionSelect.value];
  distributionParams.innerHTML = "";
  spec.params.forEach((param) => {
    const label = document.createElement("label");
    const span = document.createElement("span");
    const input = document.createElement("input");
    const range = document.createElement("input");
    span.textContent = param.label;
    input.type = "number";
    input.value = String(param.value);
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.dataset.distParam = param.key;
    range.type = "range";
    range.value = String(param.value);
    range.min = String(param.min);
    range.max = String(param.max);
    range.step = String(param.step);
    input.addEventListener("input", () => {
      range.value = input.value;
      update();
    });
    range.addEventListener("input", () => {
      input.value = range.value;
      update();
    });
    label.append(span, input, range);
    distributionParams.append(label);
  });

  if (resetDomain) {
    document.querySelector("#distMin").value = String(spec.domain[0]);
    document.querySelector("#distMax").value = String(spec.domain[1]);
  }
}

function degrees(radians) {
  return radians * (180 / Math.PI);
}

function radians(degreesValue) {
  return degreesValue * (Math.PI / 180);
}

function syncCalculusViewControls() {
  const yaw = document.querySelector("#surfaceYaw");
  const pitch = document.querySelector("#surfacePitch");
  const roll = document.querySelector("#surfaceRoll");
  if (yaw) yaw.value = String(Math.round(degrees(state.surfaceOrbit.yaw)));
  if (pitch) pitch.value = String(Math.round(degrees(state.surfaceOrbit.pitch)));
  if (roll) roll.value = String(Math.round(degrees(state.surfaceOrbit.roll)));
  const readout = document.querySelector("#flowReadout");
  if (readout) {
    readout.textContent = state.showGradientFlow
      ? `${state.flowDensity}x @ ${format(state.flowSpeed, 2)}`
      : "flow off";
  }
}

function updateModeUi() {
  const probabilityMode = state.activeMode === "distribution";
  const calculusMode = state.activeMode === "calculus";
  const nonMatrixMode = probabilityMode || calculusMode;
  const panelTitles = {
    transform: "Linear Algebra Lab",
    svd: "Matrix Analysis Lab",
    eigen: "Eigenvalue Lab",
    distribution: "Probability & Statistics Lab",
    calculus: "Calculus Lab",
  };
  document.querySelector("#controlModeTitle").textContent = panelTitles[state.activeMode] || "Math Lab";
  document.querySelectorAll(".matrix-only").forEach((section) => {
    section.classList.toggle("is-hidden", nonMatrixMode);
  });
  document.querySelectorAll(".matrix-legend").forEach((item) => {
    item.classList.toggle("is-hidden", nonMatrixMode);
  });
  document.querySelectorAll(".probability-legend").forEach((item) => {
    item.classList.toggle("is-hidden", !probabilityMode);
  });
  document.querySelectorAll(".calculus-legend").forEach((item) => {
    item.classList.toggle("is-hidden", !calculusMode);
  });
  document.querySelector(".probability-section").classList.toggle("is-hidden", !probabilityMode);
  document.querySelector(".calculus-section").classList.toggle("is-hidden", !calculusMode);
  document.querySelector(".stage-wrap").classList.toggle("calculus-stage", calculusMode);
  document.querySelector(".stage-wrap").classList.toggle("surface-stage", calculusMode && state.calculusMode !== "oneD");
  document.querySelector(".surface-probe-inputs").classList.toggle("is-hidden", !calculusMode || state.calculusMode === "oneD");
  document.querySelectorAll(".surface-view-controls").forEach((item) => {
    item.classList.toggle("is-hidden", !calculusMode || state.calculusMode === "oneD");
  });
  document.querySelector("#derivativeX").closest("label").classList.toggle("is-hidden", calculusMode && state.calculusMode !== "oneD");
  if (calculusMode) syncCalculusViewControls();
  const calculusLegend = [...document.querySelectorAll(".calculus-legend")];
  if (calculusLegend.length) {
    const legendText = state.calculusMode === "oneD"
      ? ["f(x)", "f'(x) / tangent", "area"]
      : state.calculusMode === "surface"
        ? ["z = f(x,y)", "gradient flow", "height"]
        : ["surface", "gradient flow", "tangent plane"];
    calculusLegend.forEach((item, index) => {
      const swatch = item.querySelector(".swatch");
      item.textContent = legendText[index] || "";
      if (swatch) item.prepend(swatch);
    });
  }
  document.querySelector(".matrix-inputs").classList.toggle("is-hidden", state.dimension === 3);
  document.querySelector(".slider-stack").classList.toggle("is-hidden", state.dimension === 3);
  document.querySelector(".matrix3-inputs").classList.toggle("is-hidden", state.dimension !== 3);
  document.querySelector(".decomposition-section").classList.toggle("is-hidden", nonMatrixMode || state.dimension === 3);
  document.querySelector(".vector-section").classList.toggle("is-hidden", nonMatrixMode || state.dimension === 3);
  document.querySelector("#playPause").disabled = nonMatrixMode;
  if (nonMatrixMode) {
    state.playing = false;
    document.querySelector("#playPause").textContent = "▶";
  }
}

function animate(time) {
  if (!state.lastTime) state.lastTime = time;
  const delta = Math.min(80, time - state.lastTime);
  state.lastTime = time;

  if (state.playing) {
    const speed = Number(document.querySelector("#speed").value);
    state.mix += (delta / 1000) * speed * 0.45;
    if (state.mix >= 1) {
      state.mix = 1;
      state.playing = false;
      document.querySelector("#playPause").textContent = "▶";
      document.querySelector("#playPause").title = "Play animation";
    }
    document.querySelector("#mix").value = String(state.mix);
    update();
  }

  if (state.activeMode === "calculus") {
    state.flowPhase = (state.flowPhase + (delta / 5600) * (state.flowSpeed / 0.35)) % 1;
    if (time - state.lastFlowDraw > 70) {
      state.lastFlowDraw = time;
      draw();
    }
  }

  requestAnimationFrame(animate);
}

inputIds.forEach((id, index) => {
  inputs[id].addEventListener("input", () => {
    state.target[index] = Number(inputs[id].value) || 0;
    const slider = sliders.find((item) => item.dataset.cell === id);
    slider.value = clamp(state.target[index], -3, 3);
    update();
  });
});

sliders.forEach((slider) => {
  slider.addEventListener("input", () => {
    const id = slider.dataset.cell;
    const index = inputIds.indexOf(id);
    state.target[index] = Number(slider.value);
    inputs[id].value = format(state.target[index]);
    update();
  });
});

input3Ids.forEach((id, index) => {
  inputs3[id].addEventListener("input", () => {
    state.target3[index] = Number(inputs3[id].value) || 0;
    update();
  });
});

document.querySelector("#identity").addEventListener("click", () => {
  if (state.dimension === 3) setTarget3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  else setTarget([1, 0, 0, 1]);
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => setTarget(presets[button.dataset.preset]));
});

document.querySelectorAll("[data-preset3]").forEach((button) => {
  button.addEventListener("click", () => {
    state.dimension = 3;
    document.querySelectorAll("[data-dimension]").forEach((item) => item.classList.toggle("active", item.dataset.dimension === "3"));
    setTarget3(presets3[button.dataset.preset3]);
    updateModeUi();
  });
});

document.querySelectorAll("[data-dimension]").forEach((button) => {
  button.addEventListener("click", () => {
    state.dimension = Number(button.dataset.dimension);
    document.querySelectorAll("[data-dimension]").forEach((item) => item.classList.toggle("active", item === button));
    updateModeUi();
    update();
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeMode = tab.dataset.mode;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    updateModeUi();
    update();
  });
});

plotButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.plotMode = button.dataset.plot;
    plotButtons.forEach((item) => item.classList.toggle("active", item === button));
    update();
  });
});

document.querySelectorAll("[data-calculus-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.calculusMode = button.dataset.calculusMode;
    document.querySelectorAll("[data-calculus-mode]").forEach((item) => item.classList.toggle("active", item === button));
    updateModeUi();
    update();
  });
});

document.querySelectorAll("[data-function-chip]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#functionInput").value = button.dataset.functionChip;
    update();
  });
});

distributionSelect.addEventListener("change", () => {
  renderDistributionParams(true);
  update();
});

document.querySelector("#distMin").addEventListener("input", update);
document.querySelector("#distMax").addEventListener("input", update);
document.querySelector("#intervalA").addEventListener("input", update);
document.querySelector("#intervalB").addEventListener("input", update);
document.querySelector("#combineMode").addEventListener("change", update);
document.querySelector("#functionInput").addEventListener("input", update);
document.querySelector("#calcMin").addEventListener("input", update);
document.querySelector("#calcMax").addEventListener("input", update);
document.querySelector("#derivativeX").addEventListener("input", update);
document.querySelector("#integralA").addEventListener("input", update);
document.querySelector("#integralB").addEventListener("input", update);
document.querySelector("#surfaceX").addEventListener("input", update);
document.querySelector("#surfaceY").addEventListener("input", update);
document.querySelector("#fDf1").addEventListener("input", update);
document.querySelector("#fDf2").addEventListener("input", update);
document.querySelector("#surfaceYaw").addEventListener("input", (event) => {
  state.surfaceOrbit.yaw = radians(Number(event.target.value) || 0);
  update();
});
document.querySelector("#surfacePitch").addEventListener("input", (event) => {
  state.surfaceOrbit.pitch = radians(Number(event.target.value) || 45);
  update();
});
document.querySelector("#surfaceRoll").addEventListener("input", (event) => {
  state.surfaceOrbit.roll = radians(Number(event.target.value) || 0);
  update();
});
document.querySelector("#showGradientFlow").addEventListener("change", (event) => {
  state.showGradientFlow = event.target.checked;
  syncCalculusViewControls();
  update();
});
document.querySelector("#flowDensity").addEventListener("input", (event) => {
  state.flowDensity = Number(event.target.value) || 6;
  syncCalculusViewControls();
  update();
});
document.querySelector("#flowSpeed").addEventListener("input", (event) => {
  state.flowSpeed = Number(event.target.value) || 0.35;
  syncCalculusViewControls();
});
document.querySelector("#gradientReach").addEventListener("input", (event) => {
  state.gradientReach = Number(event.target.value) || 0.09;
  update();
});
document.querySelector("#applyFunctionPreset").addEventListener("click", () => {
  const value = document.querySelector("#functionPreset").value;
  document.querySelector("#functionInput").value = calculusPresets[value] || value;
  update();
});
document.querySelector("#functionPreset").addEventListener("change", () => {
  const value = document.querySelector("#functionPreset").value;
  document.querySelector("#functionInput").value = calculusPresets[value] || value;
  update();
});

document.querySelector("#addDistributionLayer").addEventListener("click", () => {
  state.distributionLayers.push(snapshotDistribution());
  state.nextLayerId += 1;
  renderLayerList();
  update();
});

document.querySelector("#clearDistributionLayers").addEventListener("click", () => {
  state.distributionLayers = [];
  renderLayerList();
  update();
});

document.querySelector("#distributionLayers").addEventListener("input", (event) => {
  const id = Number(event.target.dataset.layerWeight);
  const paramId = Number(event.target.dataset.layerParamId);
  const layer = state.distributionLayers.find((item) => item.id === (id || paramId));
  if (!layer) return;

  if (id) {
    layer.weight = clamp(Number(event.target.value) || 0, 0, 10);
  }

  if (paramId) {
    const paramKey = event.target.dataset.layerParamKey;
    const param = distributionSpecs[layer.key].params.find((item) => item.key === paramKey);
    if (!param) return;
    const value = Number(event.target.value);
    layer.params[paramKey] = clamp(Number.isFinite(value) ? value : param.value, param.min, param.max);
  }

  update();
});

document.querySelector("#distributionLayers").addEventListener("click", (event) => {
  const id = Number(event.target.dataset.removeLayer);
  if (!id) return;
  state.distributionLayers = state.distributionLayers.filter((layer) => layer.id !== id);
  renderLayerList();
  update();
});

Object.values(toggles).forEach((toggle) => toggle.addEventListener("change", update));

document.querySelector("#mix").addEventListener("input", (event) => {
  state.mix = Number(event.target.value);
  update();
});

document.querySelector("#playPause").addEventListener("click", () => {
  if (state.activeMode === "distribution") return;
  if (!state.playing && state.mix >= 1) {
    state.mix = 0;
    document.querySelector("#mix").value = "0";
  }
  state.playing = !state.playing;
  document.querySelector("#playPause").textContent = state.playing ? "Ⅱ" : "▶";
  document.querySelector("#playPause").title = state.playing ? "Pause animation" : "Play animation";
  update();
});

document.querySelector("#resetView").addEventListener("click", () => {
  state.scale = 64;
  state.pan = { x: 0, y: 0 };
  if (state.activeMode === "calculus") {
    state.scale = 64;
    state.surfaceOrbit = { yaw: -Math.PI / 4, pitch: 0.78, roll: 0 };
    syncCalculusViewControls();
  }
  update();
});

document.querySelector("#resetCalculusView").addEventListener("click", () => {
  state.pan = { x: 0, y: 0 };
  state.scale = 64;
  state.surfaceOrbit = { yaw: -Math.PI / 4, pitch: 0.78, roll: 0 };
  syncCalculusViewControls();
  update();
});

document.querySelector("#exportPng").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "linear-transformation.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.querySelector("#probeX").addEventListener("input", update);
document.querySelector("#probeY").addEventListener("input", update);

canvas.addEventListener("pointerdown", (event) => {
  if (state.activeMode === "distribution") return;
  if (state.activeMode === "calculus" && state.calculusMode === "oneD") return;
  state.dragging = true;
  state.dragStart = { x: event.clientX, y: event.clientY };
  state.panStart = { ...state.pan };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (state.activeMode === "distribution") {
    updateDistributionHover(event);
    return;
  }
  if (state.activeMode === "calculus") {
    if (!state.dragging) return;
    const dx = event.clientX - state.dragStart.x;
    const dy = event.clientY - state.dragStart.y;
    state.surfaceOrbit.yaw += dx * 0.005;
    state.surfaceOrbit.pitch = clamp(state.surfaceOrbit.pitch + dy * 0.0035, 0.22, 1.42);
    state.surfaceOrbit.roll += (event.shiftKey ? dx * 0.012 : dx * 0.0018);
    if (state.surfaceOrbit.roll > Math.PI) state.surfaceOrbit.roll -= Math.PI * 2;
    if (state.surfaceOrbit.roll < -Math.PI) state.surfaceOrbit.roll += Math.PI * 2;
    state.dragStart = { x: event.clientX, y: event.clientY };
    syncCalculusViewControls();
    draw();
    return;
  }
  if (!state.dragging) return;
  state.pan = {
    x: state.panStart.x + event.clientX - state.dragStart.x,
    y: state.panStart.y + event.clientY - state.dragStart.y,
  };
  draw();
});

canvas.addEventListener("pointerup", () => {
  state.dragging = false;
});

canvas.addEventListener("wheel", (event) => {
  if (state.activeMode === "distribution") return;
  if (state.activeMode === "calculus" && state.calculusMode === "oneD") return;
  event.preventDefault();
  if (state.activeMode === "calculus") {
    if (event.shiftKey) {
      state.surfaceOrbit.roll += event.deltaY > 0 ? -0.08 : 0.08;
      if (state.surfaceOrbit.roll > Math.PI) state.surfaceOrbit.roll -= Math.PI * 2;
      if (state.surfaceOrbit.roll < -Math.PI) state.surfaceOrbit.roll += Math.PI * 2;
      syncCalculusViewControls();
      draw();
      return;
    }
    state.scale = clamp(state.scale * (event.deltaY > 0 ? 0.93 : 1.07), 34, 120);
    draw();
    return;
  }
  const before = screenToWorld([event.offsetX, event.offsetY]);
  const factor = event.deltaY > 0 ? 0.9 : 1.1;
  state.scale = clamp(state.scale * factor, 24, 180);
  const after = screenToWorld([event.offsetX, event.offsetY]);
  state.pan.x += (after[0] - before[0]) * state.scale;
  state.pan.y -= (after[1] - before[1]) * state.scale;
  draw();
}, { passive: false });

window.addEventListener("resize", resize);

syncControlsFromTarget();
syncControlsFromTarget3();
renderDistributionParams(true);
renderLayerList();
updateModeUi();
resize();
requestAnimationFrame(animate);
