"""
app.py - Example Flask application exposing a /run endpoint for local testing.

This is intentionally lightweight and designed for demonstration in local development.
It constructs a random interference graph based on the posted parameters and
invokes the project's CSP and Local Search implementations once. For large
inputs, CSP backtracking is skipped to avoid long-running computations.

Usage (development):
  pip install flask
  python app.py

POST /run
  Payload: { "n_nodes": <int>, "n_freqs": <int>, "interference_prob": <float 0..1> }
  Response: JSON with csp_conflicts, csp_time, csp_assignment (optional),
            local_conflicts, local_time, local_assignment, graph (edge list)
"""

import time
import random

from flask import Flask, request, jsonify, render_template # type: ignore

from src.graph import InterferenceGraph
from src.csp import backtracking
from src.local_search import local_search

app = Flask(__name__)


@app.route('/', methods=['GET'])
def index():
    """Serve the demo frontend index template."""
    return render_template('index.html')


def count_total_conflicts(assignment, graph):
    """Count undirected conflicts (each edge once)."""
    conflicts = 0
    seen = set()
    for s, f in assignment.items():
        for n in graph.get_neighbors(s):
            if (n, s) in seen:
                continue
            seen.add((s, n))
            if assignment.get(n) == f:
                conflicts += 1
    return conflicts


@app.route('/run', methods=['POST'])
def run_experiment():
    """Run an experiment and return JSON results.

    Expected POST JSON:
    {
        "num_stations": int,
        "num_frequencies": int,
        "interference_prob": float (0..1),
        "algorithm": "csp" | "local" | "compare"
    }

    Response includes both CSP and Local Search results to make comparisons simple
    and predictable for the frontend and for report generation.
    """

    payload = request.get_json() or {}
    # Backwards compatible keys (accept old names if present)
    n_nodes = int(payload.get('num_stations', payload.get('n_nodes', 10)))
    n_freqs = int(payload.get('num_frequencies', payload.get('n_freqs', 3)))
    p = float(payload.get('interference_prob', payload.get('interference_prob', 0.25)))
    algorithm = str(payload.get('algorithm', 'compare')).lower()

    # Safety caps for local testing
    n_nodes = max(1, min(200, n_nodes))
    n_freqs = max(1, min(100, n_freqs))
    p = max(0.0, min(1.0, p))

    # Build graph
    graph = InterferenceGraph()
    stations = [f"S{i}" for i in range(n_nodes)]
    for s in stations:
        graph.add_station(s)

    graph_edges = []
    for i, s1 in enumerate(stations):
        for s2 in stations[i + 1:]:
            if random.random() < p:
                graph.add_interference(s1, s2)
                graph_edges.append([s1, s2])

    frequencies = list(range(1, n_freqs + 1))

    # Prepare default response fields
    csp_assignment = None
    csp_conflicts = None
    csp_time = None

    local_assignment = None
    local_conflicts = None
    local_time = None

    CSP_NODE_LIMIT = 12  # keep small for demo; document in README

    # Helper: run CSP when requested and when size allows
    def maybe_run_csp():
        nonlocal csp_assignment, csp_conflicts, csp_time
        if n_nodes > CSP_NODE_LIMIT:
            csp_conflicts = f"skipped (n > {CSP_NODE_LIMIT})"
            csp_assignment = None
            csp_time = None
            return
        try:
            t0 = time.perf_counter()
            csp_assignment = backtracking({}, stations, frequencies, graph)
            csp_time = time.perf_counter() - t0
            if csp_assignment is None:
                csp_conflicts = "No solution"
            else:
                csp_conflicts = count_total_conflicts(csp_assignment, graph)
        except Exception as e:
            csp_assignment = None
            csp_conflicts = f"error: {str(e)}"
            csp_time = None

    # Helper: run Local Search
    def maybe_run_local():
        nonlocal local_assignment, local_conflicts, local_time
        try:
            t0 = time.perf_counter()
            local_assignment = local_search(stations, frequencies, graph, max_steps=2000)
            local_time = time.perf_counter() - t0
            local_conflicts = count_total_conflicts(local_assignment, graph)
        except Exception as e:
            local_assignment = None
            local_conflicts = f"error: {str(e)}"
            local_time = None

    # Execute based on algorithm selection
    if algorithm == 'csp':
        maybe_run_csp()
    elif algorithm == 'local':
        maybe_run_local()
    else:  # compare / default
        maybe_run_csp()
        maybe_run_local()

    response = {
        'stations': stations,
        'frequencies': frequencies,
        'graph_edges': graph_edges,

        'csp_time': round(csp_time, 6) if csp_time is not None else None,
        'csp_conflicts': csp_conflicts,
        'csp_assignment': csp_assignment,

        'local_time': round(local_time, 6) if local_time is not None else None,
        'local_conflicts': local_conflicts,
        'local_assignment': local_assignment,
    }

    return jsonify(response)


if __name__ == '__main__':
    # Simple dev server that opens a browser tab for convenience
    import threading, webbrowser, time
    def _open():
        time.sleep(0.8)
        try:
            webbrowser.open('http://127.0.0.1:5000')
        except Exception:
            pass
    threading.Thread(target=_open, daemon=True).start()
    app.run(debug=True, host='127.0.0.1', port=5000)
