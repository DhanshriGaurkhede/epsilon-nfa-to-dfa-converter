# ε-NFA to Minimized DFA Converter (TOC TAE-1 Project)

A clean, interactive, and educational web application for Theory of Computation (TOC). It implements a multi-stage pipeline converting an non-deterministic finite automaton with epsilon transitions ($\epsilon$-NFA) into an equivalent minimized deterministic finite automaton (DFA), along with an interactive string acceptance simulator.

---

## 📌 Project Overview

- **Course**: Theory of Computation (TOC)
- **Project Title**: Epsilon-NFA to Minimized DFA Converter
- **Assignment**: TAE-1 (Theory Assessment / Evaluation)

---

## 🚀 7-Stage Pipeline

1. **Stage 1: Input $\epsilon$-NFA Specification**
   - Formal 5-tuple input: $M = (Q, \Sigma, \delta, q_0, F)$
   - Visual transition matrix with support for $\epsilon$-transitions.
   - Built-in textbook presets:
     - `(a|b)*ab`
     - Strings ending in `01`
     - Regular expression `a*b+`
     - Cascading $\epsilon$-transitions ($q_0 \xrightarrow{\epsilon} q_1 \xrightarrow{\epsilon} q_2$)

2. **Stage 2: $\epsilon$-Closure Calculation**
   - Computes $\epsilon\text{-closure}(q)$ for each state $q \in Q$ using graph reachability.
   - Displays detailed step-by-step paths for each closure.

3. **Stage 3: Conversion to Standard NFA (without $\epsilon$)**
   - Computes new transitions:
     $$\delta'(q, a) = \epsilon\text{-closure}(\delta(\epsilon\text{-closure}(q), a))$$
   - Updates final states:
     $$F' = \{ q \in Q \mid \epsilon\text{-closure}(q) \cap F \neq \emptyset \}$$

4. **Stage 4: Subset Construction (NFA $\to$ DFA)**
   - Computes power-set DFA states ($2^Q$) with subset tracking (e.g. $D_0 = \{q_0, q_1\}$).
   - Identifies initial state $[q_0']$ and DFA accept states.

5. **Stage 5: DFA Minimization (Equivalence Partitioning)**
   - Removes unreachable / dead states.
   - Iterative equivalence partition refinement:
     - $P_0 = \{ F, Q \setminus F \}$ (0-equivalence)
     - $P_1, P_2, \dots, P_k$ until $P_k = P_{k-1}$
   - Displays the exact sequence of partitions.

6. **Stage 6: Final Minimized DFA Transition Table**
   - Displays the minimal state transition table.
   - Clear state markers: $\rightarrow$ for Start State and $*$ for Final States.

7. **Stage 7: String Acceptance Simulator**
   - **Single String Trace**: Simulates state transitions step-by-step ($q_0 \xrightarrow{w_1} q_1 \xrightarrow{w_2} \dots \xrightarrow{w_n} q_n$) showing remaining string, current state, and **ACCEPTED / REJECTED** status.
   - **Batch String Validator**: Tests multiple candidate strings simultaneously.

---

## 📁 File Structure

```
TOC/
├── index.html          # Main web application user interface
├── css/
│   └── style.css       # Academic styling, tables, badges, and responsive layout
├── js/
│   ├── automata.js     # Core TOC theoretical engine & algorithms
│   └── app.js          # UI controller, presets, and dynamic table generators
└── README.md           # Project documentation and theoretical background
```

---

## 💻 How to Run

No heavy dependencies or build tools required. You can run the application directly:

### Option 1: Direct in Browser
Double-click `index.html` to open it in Google Chrome, Microsoft Edge, Firefox, or any modern web browser.

### Option 2: Local HTTP Server (Python)
Open PowerShell or Terminal in the project directory and run:
```powershell
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

---

## 🧪 Example Test Run

For $\epsilon$-NFA accepting `(a|b)*ab`:
- **States**: `q0, q1, q2, q3`
- **Alphabet**: `a, b`
- **Start State**: `q0`
- **Final States**: `q3`
- **Transitions**:
  - $\delta(q_0, a) = \{q_0, q_1\}$, $\delta(q_0, b) = \{q_0\}$
  - $\delta(q_1, b) = \{q_2\}$
  - $\delta(q_2, \epsilon) = \{q_3\}$

### String Verification:
- `ab` $\to$ **ACCEPTED**
- `aab` $\to$ **ACCEPTED**
- `bab` $\to$ **ACCEPTED**
- `bbaab` $\to$ **ACCEPTED**
- `a` $\to$ **REJECTED**
- `b` $\to$ **REJECTED**
- `aba` $\to$ **REJECTED**
