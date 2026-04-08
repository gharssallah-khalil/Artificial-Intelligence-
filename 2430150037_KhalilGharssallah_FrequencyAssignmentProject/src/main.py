import random
import time
import math
import matplotlib.pyplot as plt
from src.graph import InterferenceGraph
from src.csp import backtracking
from src.local_search import local_search


# -------------------------------------------------
# Utility: count total conflicts
# -------------------------------------------------
def count_total_conflicts(assignment, graph):
    conflicts = 0
    checked = set()
    for s in assignment:
        for n in graph.get_neighbors(s):
            if (n, s) in checked:
                continue
            checked.add((s, n))
            if assignment[s] == assignment[n]:
                conflicts += 1
    return conflicts


# -------------------------------------------------
# Visualization 1: Interference Graph
# -------------------------------------------------
def draw_interference_graph(graph, stations):
    n = len(stations)
    angle_step = 2 * math.pi / n

    positions = {}
    for i, s in enumerate(stations):
        angle = i * angle_step
        positions[s] = (math.cos(angle), math.sin(angle))

    # Draw nodes
    for s, (x, y) in positions.items():
        plt.scatter(x, y)
        plt.text(x + 0.02, y + 0.02, s)

    # Draw edges
    for s in stations:
        for nbor in graph.get_neighbors(s):
            x1, y1 = positions[s]
            x2, y2 = positions[nbor]
            plt.plot([x1, x2], [y1, y2], linewidth=0.5)

    plt.title("Interference Graph (Base Stations)")
    plt.axis("off")
    plt.show()


# -------------------------------------------------
# Visualization 2: Execution Time
# -------------------------------------------------
def plot_execution_time(csp_time, ls_time):
    methods = ["CSP Backtracking", "Local Search"]
    times = [csp_time, ls_time]

    plt.figure()
    plt.bar(methods, times)
    plt.ylabel("Average Time (seconds)")
    plt.title("Execution Time Comparison")
    plt.show()


# -------------------------------------------------
# Visualization 3: Conflicts
# -------------------------------------------------
def plot_conflicts(csp_conflicts, ls_conflicts):
    methods = ["CSP Backtracking", "Local Search"]
    csp_value = 0 if csp_conflicts == "No solution" else csp_conflicts
    conflicts = [csp_value, ls_conflicts]

    plt.figure()
    plt.bar(methods, conflicts)
    plt.ylabel("Number of Conflicts")
    plt.title("Conflict Comparison")
    plt.show()


# -------------------------------------------------
# Problem definition (AUTO & REPRODUCIBLE)
# -------------------------------------------------
random.seed(42)

graph = InterferenceGraph()

NUM_STATIONS = 10
NUM_FREQUENCIES = 3
INTERFERENCE_PROB = 0.3
REPEATS = 50

stations = [f"S{i}" for i in range(NUM_STATIONS)]
frequencies = list(range(1, NUM_FREQUENCIES + 1))

for s in stations:
    graph.add_station(s)

for i, s1 in enumerate(stations):
    for s2 in stations[i + 1:]:
        if random.random() < INTERFERENCE_PROB:
            graph.add_interference(s1, s2)


# -------------------------------------------------
# CSP Backtracking (Average Time)
# -------------------------------------------------
start = time.perf_counter()
for _ in range(REPEATS):
    backtracking({}, stations, frequencies, graph)
csp_time = (time.perf_counter() - start) / REPEATS

csp_solution = backtracking({}, stations, frequencies, graph)
if csp_solution is not None:
    csp_conflicts = count_total_conflicts(csp_solution, graph)
else:
    csp_conflicts = "No solution"


# -------------------------------------------------
# Local Search (Average Time)
# -------------------------------------------------
start = time.perf_counter()
for _ in range(REPEATS):
    local_search(stations, frequencies, graph)
ls_time = (time.perf_counter() - start) / REPEATS

ls_solution = local_search(stations, frequencies, graph)
ls_conflicts = count_total_conflicts(ls_solution, graph)


# -------------------------------------------------
# Results
# -------------------------------------------------
print("=== Problem Settings ===")
print("Stations        :", NUM_STATIONS)
print("Frequencies     :", NUM_FREQUENCIES)
print("Interference p  :", INTERFERENCE_PROB)
print("Repeats         :", REPEATS)

print("\n=== CSP Backtracking ===")
print("Average Time :", round(csp_time, 6), "seconds")
print("Conflicts    :", csp_conflicts)

print("\n=== Local Search ===")
print("Average Time :", round(ls_time, 6), "seconds")
print("Conflicts    :", ls_conflicts)


# -------------------------------------------------
# Visualization calls
# -------------------------------------------------
draw_interference_graph(graph, stations)
plot_execution_time(csp_time, ls_time)
plot_conflicts(csp_conflicts, ls_conflicts)
