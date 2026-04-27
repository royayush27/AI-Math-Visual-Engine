# Math Visual Engine

An interactive browser lab for exploring linear algebra, calculus, probability, and statistical geometry with polished canvas visualizations and a dark frosted-glass interface.

## What It Does

Math Visual Engine is a single-page vanilla HTML/CSS/JavaScript application. It is built for fast experimentation with mathematical objects rather than static formulas.

Core modules:

- **Transform**: 2D and 3D matrix transformations with basis vectors, grids, unit shapes, presets, animation, and vector probes.
- **Matrix Analysis**: determinant, trace, rank, invertibility, eigenvalues, singular values, SVD geometry, and area-scaling interpretation.
- **Eigenvalues**: visualizes real eigen-directions and eigendecomposition behavior.
- **Probability**: distribution plots, interval probabilities, overlays, mixtures, derived relationships, and chi-squared-to-F distribution exploration.
- **Calculus**: 1D function graphs, symbolic/numeric derivatives, antiderivatives where supported, integral shading, 2D surfaces, tangent planes, and gradient-flow controls.

## Highlights

- Vanilla web stack only: no build step, no framework, no external charting library.
- Retina-aware canvas rendering.
- Dark glassmorphism UI with technical readout cards.
- Interactive calculus surface controls: yaw, pitch, roll, gradient density, speed, and reach.
- Practical symbolic/numeric hybrid calculus engine.
- Probability relationship mode for visualizing derived distributions.
- Export current canvas as PNG.

## Run Locally

Open `index.html` directly in a browser.

```text
index.html
styles.css
script.js
```

No install step is required.

## Useful Examples

Calculus input examples:

```text
sinx
sin(x)
cos(x)
sigmoid
tanh
relu
softplus
gaussian
sin(x)*cos(y)
exp(-(x^2+y^2))
```

Matrix presets include rotation, reflection, shear, scaling, projection, singular collapse, axis swap, and 3D transformations.

Probability relationships include mixture, convolution-style sums, ratio transforms, standardization, and the closed-form chi-squared ratio:

```text
(X / d1) / (Y / d2) ~ F(d1, d2)
```

## Controls

- Drag the matrix canvas to pan.
- Mouse wheel zooms matrix views.
- In calculus surface/tangent-plane modes:
  - Drag to rotate the surface.
  - Shift + drag or Shift + wheel rolls the surface.
  - Use **Reset View** to restore the clean default orientation.
- Use **Export PNG** to save the current visualization.

## Project Structure

```text
.
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Notes

The symbolic math system is intentionally practical rather than exhaustive. When an exact form is supported, the app shows it. When it is not, it falls back to numerical derivatives, partial derivatives, integrals, and local linear approximations.

## License

royayush27
