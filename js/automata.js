/**
 * automata.js - Core Theory of Computation Engine
 * Implements:
 * 1. Epsilon-NFA definition & validation
 * 2. Epsilon-Closure computation
 * 3. Epsilon-NFA to Standard NFA conversion
 * 4. Subset Construction (NFA to DFA)
 * 5. DFA Minimization (Hopcroft / Equivalence Partitioning P0, P1, ..., Pk)
 * 6. String Simulation with detailed path trace
 */

class AutomataEngine {
    /**
     * Parse and clean state/symbol list from string input
     */
    static parseSet(inputStr) {
        if (!inputStr) return [];
        return inputStr
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * Compute Epsilon Closures for all states in an Epsilon-NFA
     * @param {Array<string>} states - List of states Q
     * @param {Object} transitions - Map of state -> { symbol: Array<state> }
     * @param {string} epsilonSymbol - Symbol used for epsilon (e.g. 'ε')
     * @returns {Object} { closures: { state: Array<string> }, steps: { state: Array<string> } }
     */
    static computeEpsilonClosures(states, transitions, epsilonSymbol = 'ε') {
        const closures = {};
        const logs = {};

        for (const state of states) {
            const closureSet = new Set([state]);
            const queue = [state];
            const logSteps = [`Initial: {${state}}`];

            while (queue.length > 0) {
                const curr = queue.shift();
                const currTrans = transitions[curr] || {};
                const epsTargets = currTrans[epsilonSymbol] || [];

                for (const nextState of epsTargets) {
                    if (!closureSet.has(nextState)) {
                        closureSet.add(nextState);
                        queue.push(nextState);
                        logSteps.push(`Via ${curr} --${epsilonSymbol}--> ${nextState}, added ${nextState}`);
                    }
                }
            }

            closures[state] = Array.from(closureSet).sort();
            logs[state] = logSteps;
        }

        return { closures, logs };
    }

    /**
     * Convert Epsilon-NFA to Standard NFA
     * δ'(q, a) = ε-closure(δ(ε-closure(q), a))
     * F' = { q in Q | ε-closure(q) ∩ F ≠ ∅ }
     */
    static epsilonNFAToNFA(nfaInput) {
        const { states, alphabet, startState, finalStates, transitions, epsilonSymbol = 'ε' } = nfaInput;
        const { closures } = this.computeEpsilonClosures(states, transitions, epsilonSymbol);

        const newTransitions = {};
        const stepDetails = [];

        // 1. Calculate new transitions for each state and each alphabet symbol
        for (const q of states) {
            newTransitions[q] = {};
            const qClosure = closures[q];

            for (const a of alphabet) {
                // Step A: States reachable on 'a' from any state in qClosure
                const reachableOnA = new Set();
                for (const r of qClosure) {
                    const rTargets = (transitions[r] && transitions[r][a]) || [];
                    rTargets.forEach(t => reachableOnA.add(t));
                }

                // Step B: Take epsilon-closure of reachableOnA
                const finalTargetSet = new Set();
                for (const target of reachableOnA) {
                    const tClosure = closures[target] || [target];
                    tClosure.forEach(s => finalTargetSet.add(s));
                }

                const resultStates = Array.from(finalTargetSet).sort();
                newTransitions[q][a] = resultStates;

                stepDetails.push({
                    state: q,
                    symbol: a,
                    qClosure: qClosure,
                    reachableOnA: Array.from(reachableOnA).sort(),
                    resultStates: resultStates
                });
            }
        }

        // 2. Calculate new Final States
        // A state q is final in NFA if ε-closure(q) contains at least one original final state
        const finalSet = new Set(finalStates);
        const newFinalStates = states.filter(q => {
            const qClosure = closures[q];
            return qClosure.some(s => finalSet.has(s));
        }).sort();

        return {
            states: [...states].sort(),
            alphabet: [...alphabet].sort(),
            startState: startState,
            finalStates: newFinalStates,
            transitions: newTransitions,
            closures: closures,
            stepDetails: stepDetails
        };
    }

    /**
     * Convert Standard NFA to DFA using Subset Construction
     */
    static nfaToDFA(nfa) {
        const { states, alphabet, startState, finalStates, transitions } = nfa;
        const finalSet = new Set(finalStates);

        // State name mapping: e.g., "q0,q1" -> "A", "{q0, q1}"
        const dfaStates = []; // array of state IDs/names
        const dfaTransitions = {}; // stateName -> { symbol: nextStateName }
        const dfaFinalStates = [];
        const stateMap = new Map(); // sorted string key -> formatted label (e.g. "A", "B")
        const keyToSetMap = new Map(); // label -> Array of original NFA states

        const getSetKey = (setArr) => Array.from(new Set(setArr)).sort().join(',');

        let nameCounter = 0;
        const getNextLabel = (key) => {
            if (key === "") return "DEAD";
            // Letters A, B, C... or S0, S1...
            const label = "D" + nameCounter++;
            return label;
        };

        const startKey = getSetKey([startState]);
        const startLabel = getNextLabel(startKey);
        stateMap.set(startKey, startLabel);
        keyToSetMap.set(startLabel, [startState]);

        const queue = [startKey];
        const stepRecords = [];

        while (queue.length > 0) {
            const currentKey = queue.shift();
            const currentLabel = stateMap.get(currentKey);
            const currentNfaSet = currentKey ? currentKey.split(',') : [];

            if (!dfaStates.includes(currentLabel)) {
                dfaStates.push(currentLabel);
            }

            // Check if current DFA state is final
            if (currentNfaSet.some(s => finalSet.has(s))) {
                if (!dfaFinalStates.includes(currentLabel)) {
                    dfaFinalStates.push(currentLabel);
                }
            }

            dfaTransitions[currentLabel] = {};

            for (const symbol of alphabet) {
                const targetNfaSet = new Set();
                for (const q of currentNfaSet) {
                    const targets = (transitions[q] && transitions[q][symbol]) || [];
                    targets.forEach(t => targetNfaSet.add(t));
                }

                const targetKey = getSetKey(Array.from(targetNfaSet));
                let targetLabel;

                if (!stateMap.has(targetKey)) {
                    targetLabel = getNextLabel(targetKey);
                    stateMap.set(targetKey, targetLabel);
                    keyToSetMap.set(targetLabel, Array.from(targetNfaSet).sort());
                    queue.push(targetKey);
                } else {
                    targetLabel = stateMap.get(targetKey);
                }

                dfaTransitions[currentLabel][symbol] = targetLabel;

                stepRecords.push({
                    fromLabel: currentLabel,
                    fromSet: currentNfaSet,
                    symbol: symbol,
                    toSet: Array.from(targetNfaSet).sort(),
                    toLabel: targetLabel
                });
            }
        }

        // Map description of states (e.g. D0 = {q0})
        const stateDescriptions = {};
        for (const [label, nfaSubSet] of keyToSetMap.entries()) {
            stateDescriptions[label] = nfaSubSet.length > 0 ? `{${nfaSubSet.join(', ')}}` : '∅ (Trap/Dead)';
        }

        return {
            states: dfaStates,
            alphabet: [...alphabet].sort(),
            startState: startLabel,
            finalStates: dfaFinalStates.sort(),
            transitions: dfaTransitions,
            stateDescriptions: stateDescriptions,
            stepRecords: stepRecords
        };
    }

    /**
     * Remove unreachable states from DFA
     */
    static removeUnreachableStates(dfa) {
        const { states, alphabet, startState, finalStates, transitions, stateDescriptions } = dfa;
        const reachable = new Set([startState]);
        const queue = [startState];

        while (queue.length > 0) {
            const curr = queue.shift();
            for (const sym of alphabet) {
                const nextState = transitions[curr] && transitions[curr][sym];
                if (nextState && !reachable.has(nextState)) {
                    reachable.add(nextState);
                    queue.push(nextState);
                }
            }
        }

        const filteredStates = states.filter(s => reachable.has(s));
        const filteredFinals = finalStates.filter(s => reachable.has(s));
        const filteredTransitions = {};
        const filteredDesc = {};

        for (const s of filteredStates) {
            filteredTransitions[s] = {};
            for (const sym of alphabet) {
                filteredTransitions[s][sym] = transitions[s][sym];
            }
            if (stateDescriptions && stateDescriptions[s]) {
                filteredDesc[s] = stateDescriptions[s];
            }
        }

        const eliminated = states.filter(s => !reachable.has(s));

        return {
            dfa: {
                states: filteredStates,
                alphabet,
                startState,
                finalStates: filteredFinals,
                transitions: filteredTransitions,
                stateDescriptions: filteredDesc
            },
            eliminated
        };
    }

    /**
     * Minimize DFA using Equivalence Partitioning (0-equivalence, 1-equivalence, ..., k-equivalence)
     */
    static minimizeDFA(dfa) {
        // Step 1: Remove unreachable states
        const { dfa: cleanDFA, eliminated } = this.removeUnreachableStates(dfa);
        const { states, alphabet, startState, finalStates, transitions, stateDescriptions } = cleanDFA;

        if (states.length === 0) {
            return {
                minimizedDFA: cleanDFA,
                partitionsHistory: [],
                eliminatedUnreachable: eliminated,
                groupMapping: {}
            };
        }

        // Handle edge case where all are final or all non-final
        const finalSet = new Set(finalStates);
        const nonFinals = states.filter(s => !finalSet.has(s)).sort();
        const finals = states.filter(s => finalSet.has(s)).sort();

        let initialPartition = [];
        if (nonFinals.length > 0) initialPartition.push(nonFinals);
        if (finals.length > 0) initialPartition.push(finals);

        const partitionsHistory = [];
        partitionsHistory.push({
            iteration: 0,
            partition: initialPartition.map(group => [...group])
        });

        let currentPartition = initialPartition;
        let iteration = 0;

        while (true) {
            iteration++;
            const nextPartition = [];

            // Helper: Find which group index a state belongs to in currentPartition
            const getGroupIndex = (state, partition) => {
                for (let i = 0; i < partition.length; i++) {
                    if (partition[i].includes(state)) return i;
                }
                return -1;
            };

            for (const group of currentPartition) {
                if (group.length <= 1) {
                    nextPartition.push(group);
                    continue;
                }

                // Split group based on transition signatures
                // Signature: array of target group indices for each alphabet symbol
                const subGroupsMap = new Map();

                for (const state of group) {
                    const signature = alphabet.map(sym => {
                        const target = transitions[state] && transitions[state][sym];
                        return target ? getGroupIndex(target, currentPartition) : -1;
                    }).join('|');

                    if (!subGroupsMap.has(signature)) {
                        subGroupsMap.set(signature, []);
                    }
                    subGroupsMap.get(signature).push(state);
                }

                for (const subGroup of subGroupsMap.values()) {
                    nextPartition.push(subGroup.sort());
                }
            }

            // Sort next partition for consistent comparison
            nextPartition.sort((a, b) => a[0].localeCompare(b[0]));

            partitionsHistory.push({
                iteration: iteration,
                partition: nextPartition.map(g => [...g])
            });

            // Check if partition did not change
            const isSame = (p1, p2) => {
                if (p1.length !== p2.length) return false;
                for (let i = 0; i < p1.length; i++) {
                    if (p1[i].length !== p2[i].length) return false;
                    for (let j = 0; j < p1[i].length; j++) {
                        if (p1[i][j] !== p2[i][j]) return false;
                    }
                }
                return true;
            };

            if (isSame(currentPartition, nextPartition)) {
                break;
            }

            currentPartition = nextPartition;
        }

        // Build Minimized DFA from final partition
        const finalPartition = currentPartition;
        const groupToStateName = new Map();
        const minStates = [];
        let minStartState = null;
        const minFinalStates = [];
        const groupMapping = {};

        finalPartition.forEach((group, idx) => {
            const minName = "M" + idx;
            minStates.push(minName);
            groupToStateName.set(group, minName);

            // Group mapping description
            const groupDesc = group.map(s => {
                const origDesc = stateDescriptions && stateDescriptions[s] ? ` (${stateDescriptions[s]})` : '';
                return `${s}${origDesc}`;
            }).join(', ');
            groupMapping[minName] = {
                states: group,
                description: `{${group.join(', ')}}`,
                fullDescription: `{${groupDesc}}`
            };

            // Check start state
            if (group.includes(startState)) {
                minStartState = minName;
            }

            // Check final state
            if (group.some(s => finalSet.has(s))) {
                minFinalStates.push(minName);
            }
        });

        // Transitions of Minimized DFA
        const minTransitions = {};
        for (const group of finalPartition) {
            const minName = groupToStateName.get(group);
            minTransitions[minName] = {};
            const representativeState = group[0];

            for (const sym of alphabet) {
                const origTarget = transitions[representativeState] && transitions[representativeState][sym];
                if (origTarget) {
                    // Find which group contains origTarget
                    const targetGroup = finalPartition.find(g => g.includes(origTarget));
                    const targetMinName = groupToStateName.get(targetGroup);
                    minTransitions[minName][sym] = targetMinName;
                } else {
                    minTransitions[minName][sym] = "-";
                }
            }
        }

        return {
            minimizedDFA: {
                states: minStates,
                alphabet: [...alphabet].sort(),
                startState: minStartState,
                finalStates: minFinalStates.sort(),
                transitions: minTransitions
            },
            partitionsHistory,
            eliminatedUnreachable: eliminated,
            groupMapping
        };
    }

    /**
     * Simulate a string on a DFA and return step-by-step trace
     */
    static simulateString(dfa, inputString) {
        const { startState, finalStates, transitions, alphabet } = dfa;
        const finalSet = new Set(finalStates);
        const alphabetSet = new Set(alphabet);

        // Normalize input
        const chars = inputString.trim() === "" || inputString === "ε" || inputString === "lambda" || inputString === "^"
            ? []
            : inputString.split('');

        // Validate alphabet
        for (const char of chars) {
            if (!alphabetSet.has(char)) {
                return {
                    accepted: false,
                    error: `Invalid character '${char}' not in alphabet Σ = {${alphabet.join(', ')}}`,
                    trace: []
                };
            }
        }

        let currentState = startState;
        const trace = [
            {
                step: 0,
                char: '—',
                fromState: 'Start',
                toState: currentState,
                remainingString: chars.join('') || 'ε',
                isAcceptedAtStep: finalSet.has(currentState)
            }
        ];

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const nextState = transitions[currentState] && transitions[currentState][char];

            if (!nextState || nextState === '-' || nextState === 'DEAD') {
                trace.push({
                    step: i + 1,
                    char: char,
                    fromState: currentState,
                    toState: 'TRAP / NO TRANSITION',
                    remainingString: chars.slice(i + 1).join('') || 'ε',
                    isAcceptedAtStep: false
                });
                return {
                    accepted: false,
                    isDead: true,
                    trace: trace,
                    finalState: 'TRAP'
                };
            }

            trace.push({
                step: i + 1,
                char: char,
                fromState: currentState,
                toState: nextState,
                remainingString: chars.slice(i + 1).join('') || 'ε',
                isAcceptedAtStep: finalSet.has(nextState)
            });

            currentState = nextState;
        }

        const isAccepted = finalSet.has(currentState);

        return {
            accepted: isAccepted,
            trace: trace,
            finalState: currentState
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutomataEngine;
}
