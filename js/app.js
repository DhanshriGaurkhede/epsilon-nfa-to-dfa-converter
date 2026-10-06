/**
 * app.js - UI Controller and Application Lifecycle
 */

// Preset Examples for quick demonstration during college presentations
const PRESETS = {
    preset1: {
        name: "Pattern (a|b)*ab",
        states: "q0, q1, q2, q3",
        alphabet: "a, b",
        startState: "q0",
        finalStates: "q3",
        epsilonSymbol: "ε",
        transitions: {
            "q0": { "a": ["q0", "q1"], "b": ["q0"], "ε": [] },
            "q1": { "a": [], "b": ["q2"], "ε": [] },
            "q2": { "a": [], "b": [], "ε": ["q3"] },
            "q3": { "a": [], "b": [], "ε": [] }
        },
        sampleStrings: ["ab", "aab", "bab", "bbaab", "a", "b", "aba", ""]
    },
    preset2: {
        name: "Strings ending in 01 with Epsilon Transitions",
        states: "q0, q1, q2",
        alphabet: "0, 1",
        startState: "q0",
        finalStates: "q2",
        epsilonSymbol: "ε",
        transitions: {
            "q0": { "0": ["q0"], "1": ["q0"], "ε": ["q1"] },
            "q1": { "0": ["q1"], "1": ["q2"], "ε": [] },
            "q2": { "0": [], "1": [], "ε": [] }
        },
        sampleStrings: ["01", "001", "101", "1101", "0", "1", "00", "10"]
    },
    preset3: {
        name: "Regular Expression a*b+",
        states: "q0, q1, q2",
        alphabet: "a, b",
        startState: "q0",
        finalStates: "q2",
        epsilonSymbol: "ε",
        transitions: {
            "q0": { "a": ["q0"], "b": [], "ε": ["q1"] },
            "q1": { "a": [], "b": ["q2"], "ε": [] },
            "q2": { "a": [], "b": ["q2"], "ε": [] }
        },
        sampleStrings: ["b", "ab", "aab", "abb", "abbb", "a", "ba", ""]
    },
    preset4: {
        name: "Cascading Epsilon Transitions (q0 -> q1 -> q2)",
        states: "q0, q1, q2",
        alphabet: "0, 1",
        startState: "q0",
        finalStates: "q2",
        epsilonSymbol: "ε",
        transitions: {
            "q0": { "0": ["q0"], "1": [], "ε": ["q1"] },
            "q1": { "0": [], "1": ["q1"], "ε": ["q2"] },
            "q2": { "0": ["q2"], "1": [], "ε": [] }
        },
        sampleStrings: ["0", "1", "01", "010", "11", "00", "10", ""]
    }
};

// Application State
let currentPipeline = null;

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    loadPreset('preset1');
});

function setupEventListeners() {
    // Clear / Reset Form for Custom Input
    const btnClear = document.getElementById("btn-clear-custom");
    if (btnClear) {
        btnClear.addEventListener("click", () => {
            clearForCustomInput();
        });
    }

    // Generate Transition Table Button
    document.getElementById("btn-setup-matrix").addEventListener("click", () => {
        buildDynamicTransitionGrid();
    });

    // Auto-update matrix when states or alphabet changes
    document.getElementById("input-states").addEventListener("change", () => {
        buildDynamicTransitionGrid();
    });
    document.getElementById("input-alphabet").addEventListener("change", () => {
        buildDynamicTransitionGrid();
    });

    // Run Pipeline Button
    document.getElementById("btn-run-pipeline").addEventListener("click", () => {
        runFullPipeline();
    });

    // Single String Test Button
    document.getElementById("btn-test-string").addEventListener("click", () => {
        testSingleString();
    });

    // Batch Test Button
    document.getElementById("btn-run-batch").addEventListener("click", () => {
        runBatchTests();
    });

    // String input Enter key
    document.getElementById("test-string-input").addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            testSingleString();
        }
    });
}

/**
 * Resets input fields to allow clean entry of custom Epsilon-NFA
 */
function clearForCustomInput() {
    document.getElementById("input-states").value = "q0, q1, q2";
    document.getElementById("input-alphabet").value = "0, 1";
    document.getElementById("input-start-state").value = "q0";
    document.getElementById("input-final-states").value = "q2";
    
    // Clear container to avoid carrying over previous entries
    const container = document.getElementById("transition-matrix-container");
    if (container) container.innerHTML = "";

    // Build empty transition grid for new custom inputs
    buildDynamicTransitionGrid({});
    
    document.getElementById("test-string-input").value = "";
    document.getElementById("batch-strings-input").value = "0\n1\n01\n001\n10";
    
    const errorAlert = document.getElementById("pipeline-error");
    if (errorAlert) {
        errorAlert.style.display = "none";
        errorAlert.innerText = "";
    }

    // Scroll smoothly to custom inputs
    document.getElementById("input-states").focus();
}

function loadPreset(presetKey) {
    const p = PRESETS[presetKey];
    if (!p) return;

    document.getElementById("input-states").value = p.states;
    document.getElementById("input-alphabet").value = p.alphabet;
    document.getElementById("input-start-state").value = p.startState;
    document.getElementById("input-final-states").value = p.finalStates;

    buildDynamicTransitionGrid(p.transitions);

    if (p.sampleStrings) {
        document.getElementById("batch-strings-input").value = p.sampleStrings.join("\n");
        document.getElementById("test-string-input").value = p.sampleStrings[0] || "";
    }

    // Automatically execute pipeline for immediate preview
    runFullPipeline();
}

/**
 * Dynamically builds the interactive input table for transitions δ(q, σ)
 */
function buildDynamicTransitionGrid(presetTransitions = null) {
    const states = AutomataEngine.parseSet(document.getElementById("input-states").value);
    const alphabet = AutomataEngine.parseSet(document.getElementById("input-alphabet").value);
    const epsSymbol = "ε";

    const container = document.getElementById("transition-matrix-container");
    if (!container) return;

    // If no preset passed, harvest currently entered values from existing table to prevent data loss
    const existingValues = {};
    if (!presetTransitions) {
        const currentInputs = container.querySelectorAll(".matrix-input");
        currentInputs.forEach(inp => {
            const s = inp.dataset.state;
            const sym = inp.dataset.symbol;
            if (!existingValues[s]) existingValues[s] = {};
            existingValues[s][sym] = inp.value;
        });
    }

    container.innerHTML = "";

    if (states.length === 0 || alphabet.length === 0) {
        container.innerHTML = `<div class="alert alert-info" style="margin: 8px 0; font-size: 0.85rem;">Please enter states and alphabet first, then click 'Update Transition Matrix Table'.</div>`;
        return;
    }

    const table = document.createElement("table");
    table.className = "transition-input-table";

    // Header Row: Alphabet symbols + ε
    const allSymbols = [...alphabet, epsSymbol];
    const thead = document.createElement("thead");
    let headerRow = `<tr><th>State (q)</th>`;
    for (const sym of allSymbols) {
        headerRow += `<th>Input: ${sym}</th>`;
    }
    headerRow += `</tr>`;
    thead.innerHTML = headerRow;
    table.appendChild(thead);

    // Body Rows
    const tbody = document.createElement("tbody");
    for (const state of states) {
        const tr = document.createElement("tr");
        let rowHtml = `<td><strong>${state}</strong></td>`;

        for (const sym of allSymbols) {
            let val = "";
            if (presetTransitions && presetTransitions[state] && presetTransitions[state][sym]) {
                val = presetTransitions[state][sym].join(", ");
            } else if (existingValues[state] && existingValues[state][sym]) {
                val = existingValues[state][sym];
            }

            rowHtml += `<td>
                <input type="text" 
                       class="matrix-input" 
                       data-state="${state}" 
                       data-symbol="${sym}" 
                       placeholder="e.g. q1, q2" 
                       value="${val}">
            </td>`;
        }
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * Extracts and validates user input
 */
function extractInputData() {
    const states = AutomataEngine.parseSet(document.getElementById("input-states").value);
    const alphabet = AutomataEngine.parseSet(document.getElementById("input-alphabet").value);
    const startState = document.getElementById("input-start-state").value.trim();
    const finalStates = AutomataEngine.parseSet(document.getElementById("input-final-states").value);
    const epsSymbol = "ε";

    // Validation
    if (states.length === 0) {
        throw new Error("States set (Q) cannot be empty.");
    }
    if (alphabet.length === 0) {
        throw new Error("Alphabet (Σ) cannot be empty.");
    }
    if (!startState) {
        throw new Error("Start state (q0) is required.");
    }
    if (!states.includes(startState)) {
        throw new Error(`Start state '${startState}' is not in the set of states Q = {${states.join(', ')}}.`);
    }
    for (const f of finalStates) {
        if (!states.includes(f)) {
            throw new Error(`Final state '${f}' is not in the set of states Q = {${states.join(', ')}}.`);
        }
    }

    // Extract transitions from inputs
    const transitions = {};
    for (const s of states) {
        transitions[s] = {};
        for (const sym of alphabet) {
            transitions[s][sym] = [];
        }
        transitions[s][epsSymbol] = [];
    }

    const inputs = document.querySelectorAll(".matrix-input");
    inputs.forEach(input => {
        const s = input.dataset.state;
        const sym = input.dataset.symbol;
        const targets = AutomataEngine.parseSet(input.value);

        // Validate targets
        for (const t of targets) {
            if (!states.includes(t)) {
                throw new Error(`Invalid transition target '${t}' from state '${s}' on '${sym}'. '${t}' is not in Q.`);
            }
        }

        if (transitions[s]) {
            transitions[s][sym] = targets;
        }
    });

    return {
        states,
        alphabet,
        startState,
        finalStates,
        transitions,
        epsilonSymbol: epsSymbol
    };
}

/**
 * Executes the full 7-stage TOC pipeline
 */
function runFullPipeline() {
    const errorAlert = document.getElementById("pipeline-error");
    const resultsContainer = document.getElementById("pipeline-results");

    errorAlert.style.display = "none";
    errorAlert.innerText = "";

    try {
        const inputNFA = extractInputData();

        // Stage 2: Compute Epsilon Closures
        const { closures, logs } = AutomataEngine.computeEpsilonClosures(inputNFA.states, inputNFA.transitions, inputNFA.epsilonSymbol);

        // Stage 3: Convert Epsilon-NFA to Standard NFA
        const standardNFA = AutomataEngine.epsilonNFAToNFA(inputNFA);

        // Stage 4: Subset Construction (NFA to DFA)
        const rawDFA = AutomataEngine.nfaToDFA(standardNFA);

        // Stage 5 & 6: Minimize DFA
        const minResult = AutomataEngine.minimizeDFA(rawDFA);
        const minimizedDFA = minResult.minimizedDFA;

        currentPipeline = {
            inputNFA,
            closures,
            closureLogs: logs,
            standardNFA,
            rawDFA,
            minResult,
            minimizedDFA
        };

        // Render all visual output sections
        renderStage1_InputSummary(inputNFA);
        renderStage2_EpsilonClosures(closures, logs);
        renderStage3_StandardNFA(standardNFA);
        renderStage4_DFA(rawDFA);
        renderStage5_MinimizationPartitions(minResult);
        renderStage6_MinimizedDFA(minimizedDFA, minResult.groupMapping);

        resultsContainer.style.display = "block";

        // Pre-run sample string test
        testSingleString();
        runBatchTests();

    } catch (err) {
        errorAlert.innerText = err.message || "An unexpected error occurred during processing.";
        errorAlert.style.display = "block";
        resultsContainer.style.display = "none";
    }
}

/**
 * Render Stage 1: Input Epsilon-NFA Table
 */
function renderStage1_InputSummary(nfa) {
    const container = document.getElementById("stage1-content");
    const symbols = [...nfa.alphabet, nfa.epsilonSymbol];

    let html = `
        <div class="explanation-box">
            <strong>Formal 5-Tuple Definition:</strong> $M = (Q, \\Sigma, \\delta, q_0, F)$<br>
            • $Q = \\{${nfa.states.join(', ')}\\}$<br>
            • $\\Sigma = \\{${nfa.alphabet.join(', ')}\\}$<br>
            • $q_0 = ${nfa.startState}$<br>
            • $F = \\{${nfa.finalStates.length > 0 ? nfa.finalStates.join(', ') : '\\emptyset'}\\}$
        </div>
        <table class="toc-table">
            <thead>
                <tr>
                    <th>State</th>
                    ${symbols.map(s => `<th>${s}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (const state of nfa.states) {
        const isStart = state === nfa.startState;
        const isFinal = nfa.finalStates.includes(state);
        let prefix = isStart ? '→ ' : '';
        let suffix = isFinal ? ' *' : '';

        html += `<tr>
            <td class="state-cell ${isStart ? 'state-start' : ''} ${isFinal ? 'state-final' : ''}">${prefix}${state}${suffix}</td>`;

        for (const sym of symbols) {
            const targets = (nfa.transitions[state] && nfa.transitions[state][sym]) || [];
            const cellVal = targets.length > 0 ? `{${targets.join(', ')}}` : '∅';
            html += `<td>${cellVal}</td>`;
        }

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Render Stage 2: Epsilon Closures
 */
function renderStage2_EpsilonClosures(closures, logs) {
    const container = document.getElementById("stage2-content");

    let html = `
        <div class="explanation-box">
            <strong>Definition of $\\epsilon$-Closure:</strong><br>
            $\\epsilon\\text{-closure}(q)$ is the set of all states reachable from state $q$ by taking zero or more $\\epsilon$-transitions.
            Every state is always in its own $\\epsilon$-closure (reflexive property).
        </div>
        <table class="toc-table">
            <thead>
                <tr>
                    <th>State $(q)$</th>
                    <th>$\\epsilon$-closure$(q)$</th>
                    <th>Derivation Steps</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const state in closures) {
        const closureSet = `{${closures[state].join(', ')}}`;
        const stepLog = logs[state] ? logs[state].join(' → ') : closureSet;

        html += `
            <tr>
                <td><strong>${state}</strong></td>
                <td><strong style="color: var(--primary);">${closureSet}</strong></td>
                <td style="text-align: left; font-size: 0.85rem; color: var(--secondary);">${stepLog}</td>
            </tr>
        `;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Render Stage 3: Standard NFA (without Epsilon)
 */
function renderStage3_StandardNFA(nfa) {
    const container = document.getElementById("stage3-content");

    let html = `
        <div class="explanation-box">
            <strong>Mathematical Transformation Rule:</strong>
            <div class="math-formula">
                \\delta'(q, a) = \\epsilon\\text{-closure}(\\delta(\\epsilon\\text{-closure}(q), a))
            </div>
            <strong>New Accept States $F'$:</strong>
            <div class="math-formula">
                F' = \\{ q \\in Q \\mid \\epsilon\\text{-closure}(q) \\cap F \\neq \\emptyset \\} = \\{${nfa.finalStates.join(', ') || '\\emptyset'}\\}
            </div>
        </div>
        <table class="toc-table">
            <thead>
                <tr>
                    <th>State</th>
                    ${nfa.alphabet.map(s => `<th>Input: ${s}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (const state of nfa.states) {
        const isStart = state === nfa.startState;
        const isFinal = nfa.finalStates.includes(state);
        let prefix = isStart ? '→ ' : '';
        let suffix = isFinal ? ' *' : '';

        html += `<tr>
            <td class="state-cell ${isStart ? 'state-start' : ''} ${isFinal ? 'state-final' : ''}">${prefix}${state}${suffix}</td>`;

        for (const sym of nfa.alphabet) {
            const targets = (nfa.transitions[state] && nfa.transitions[state][sym]) || [];
            const cellVal = targets.length > 0 ? `{${targets.join(', ')}}` : '∅';
            html += `<td>${cellVal}</td>`;
        }

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Render Stage 4: Subset Construction (NFA to DFA)
 */
function renderStage4_DFA(dfa) {
    const container = document.getElementById("stage4-content");

    let html = `
        <div class="explanation-box">
            <strong>Subset Construction:</strong><br>
            Each DFA state corresponds to a subset of NFA states. A DFA state is accepting if it contains at least one NFA final state.
        </div>
        <table class="toc-table">
            <thead>
                <tr>
                    <th>DFA State</th>
                    <th>NFA State Subset</th>
                    ${dfa.alphabet.map(s => `<th>Input: ${s}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (const state of dfa.states) {
        const isStart = state === dfa.startState;
        const isFinal = dfa.finalStates.includes(state);
        const desc = dfa.stateDescriptions[state] || '';
        let prefix = isStart ? '→ ' : '';
        let suffix = isFinal ? ' *' : '';

        html += `<tr>
            <td class="state-cell ${isStart ? 'state-start' : ''} ${isFinal ? 'state-final' : ''}">${prefix}${state}${suffix}</td>
            <td><code>${desc}</code></td>`;

        for (const sym of dfa.alphabet) {
            const target = (dfa.transitions[state] && dfa.transitions[state][sym]) || '-';
            html += `<td>${target}</td>`;
        }

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Render Stage 5: Minimization Partitions
 */
function renderStage5_MinimizationPartitions(minResult) {
    const container = document.getElementById("stage5-content");
    const { partitionsHistory, eliminatedUnreachable } = minResult;

    let html = `
        <div class="explanation-box">
            <strong>Equivalence Partitioning Algorithm:</strong><br>
            1. Partition states into 0-equivalent classes: $P_0 = \\{ F, Q \\setminus F \\}$ (Accepting vs Non-Accepting).<br>
            2. Incrementally split groups if states have transitions to different partitions for any alphabet symbol.<br>
            3. Repeat until $P_{k+1} = P_k$ (Fixed point reached).
        </div>
    `;

    if (eliminatedUnreachable && eliminatedUnreachable.length > 0) {
        html += `<div class="alert alert-info">Removed unreachable states: <strong>{${eliminatedUnreachable.join(', ')}}</strong></div>`;
    }

    html += `<div><strong>Partition Refinement Sequence:</strong></div><div style="margin-top: 10px;">`;

    partitionsHistory.forEach(item => {
        const formattedGroups = item.partition.map(g => `{${g.join(', ')}}`).join(' , ');
        html += `
            <div class="partition-step">
                <span class="iteration-tag">P<sub>${item.iteration}</sub> :</span>
                <span>${formattedGroups}</span>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Render Stage 6: Minimized DFA Transition Table
 */
function renderStage6_MinimizedDFA(minDFA, groupMapping) {
    const container = document.getElementById("stage6-content");

    let html = `
        <div class="explanation-box">
            <strong>Minimized DFA Specification:</strong><br>
            • Total Minimized States: <strong>${minDFA.states.length}</strong><br>
            • Start State: <strong>${minDFA.startState || 'None'}</strong><br>
            • Final States: <strong>{${minDFA.finalStates.join(', ') || '∅'}}</strong>
        </div>
        <table class="toc-table">
            <thead>
                <tr>
                    <th>Minimized State</th>
                    <th>Merged Original States</th>
                    ${minDFA.alphabet.map(s => `<th>Input: ${s}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (const state of minDFA.states) {
        const isStart = state === minDFA.startState;
        const isFinal = minDFA.finalStates.includes(state);
        const mapInfo = groupMapping[state] ? groupMapping[state].fullDescription : '';
        let prefix = isStart ? '→ ' : '';
        let suffix = isFinal ? ' *' : '';

        html += `<tr>
            <td class="state-cell ${isStart ? 'state-start' : ''} ${isFinal ? 'state-final' : ''}">${prefix}${state}${suffix}</td>
            <td><code>${mapInfo}</code></td>`;

        for (const sym of minDFA.alphabet) {
            const target = (minDFA.transitions[state] && minDFA.transitions[state][sym]) || '-';
            html += `<td><strong>${target}</strong></td>`;
        }

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

/**
 * Stage 7: Test a single string on the Minimized DFA
 */
function testSingleString() {
    if (!currentPipeline || !currentPipeline.minimizedDFA) return;

    const inputVal = document.getElementById("test-string-input").value;
    const resultBox = document.getElementById("single-test-result");
    const traceBox = document.getElementById("single-test-trace");

    const result = AutomataEngine.simulateString(currentPipeline.minimizedDFA, inputVal);

    if (result.error) {
        resultBox.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        traceBox.innerHTML = "";
        return;
    }

    const badgeClass = result.accepted ? "badge-accepted" : "badge-rejected";
    const badgeText = result.accepted ? "✓ ACCEPTED" : "✗ REJECTED";
    const displayString = inputVal.trim() === "" ? "ε (Empty String)" : `"${inputVal}"`;

    resultBox.innerHTML = `
        <div>Testing String: <strong>${displayString}</strong></div>
        <div class="sim-result-badge ${badgeClass}">${badgeText}</div>
        <div style="font-size: 0.85rem; color: var(--secondary); margin-top: 6px;">
            Ended at State: <strong>${result.finalState}</strong> ${result.accepted ? '(Accepting State)' : '(Non-Accepting / Trap)'}
        </div>
    `;

    // Trace Table
    let traceHtml = `
        <table class="trace-table">
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Current State</th>
                    <th>Input Symbol</th>
                    <th>Next State</th>
                    <th>Remaining String</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    result.trace.forEach(step => {
        traceHtml += `
            <tr>
                <td>${step.step}</td>
                <td><strong>${step.fromState}</strong></td>
                <td><code>${step.char}</code></td>
                <td><strong>${step.toState}</strong></td>
                <td><code>${step.remainingString}</code></td>
                <td>${step.isAcceptedAtStep ? '<span style="color:var(--success);font-weight:600;">Accepting</span>' : '<span style="color:var(--secondary);">Non-Accepting</span>'}</td>
            </tr>
        `;
    });

    traceHtml += `</tbody></table>`;
    traceBox.innerHTML = traceHtml;
}

/**
 * Stage 7: Run Batch Tests on multiple strings
 */
function runBatchTests() {
    if (!currentPipeline || !currentPipeline.minimizedDFA) return;

    const rawLines = document.getElementById("batch-strings-input").value.split("\n");
    const container = document.getElementById("batch-results-container");
    container.innerHTML = "";

    const stringsToTest = rawLines
        .map(s => s.trim())
        .filter((s, idx, arr) => s.length > 0 || arr.length === 1);

    if (stringsToTest.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">No strings provided for batch test.</span>`;
        return;
    }

    const grid = document.createElement("div");
    grid.className = "batch-grid";

    let passCount = 0;

    stringsToTest.forEach(testStr => {
        const result = AutomataEngine.simulateString(currentPipeline.minimizedDFA, testStr);
        const isAcc = result.accepted;
        if (isAcc) passCount++;

        const item = document.createElement("div");
        item.className = `batch-item ${isAcc ? 'batch-accepted' : 'batch-rejected'}`;

        const strLabel = testStr === "" ? "ε (Empty)" : `"${testStr}"`;
        item.innerHTML = `
            <span><code>${strLabel}</code></span>
            <strong style="color: ${isAcc ? 'var(--success)' : 'var(--danger)'};">
                ${isAcc ? 'ACCEPTED' : 'REJECTED'}
            </strong>
        `;
        grid.appendChild(item);
    });

    const summary = document.createElement("div");
    summary.style.marginBottom = "10px";
    summary.style.fontSize = "0.9rem";
    summary.innerHTML = `Tested <strong>${stringsToTest.length}</strong> strings: 
        <span style="color: var(--success); font-weight:600;">${passCount} Accepted</span>, 
        <span style="color: var(--danger); font-weight:600;">${stringsToTest.length - passCount} Rejected</span>`;

    container.appendChild(summary);
    container.appendChild(grid);
}
