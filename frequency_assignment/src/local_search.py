# local_search.py
# This file implements a simple Local Search (Min-Conflicts) algorithm.

import random


def count_conflicts(station, assignment, graph):
    """
    Count how many conflicts a station has with its neighbors.
    """
    conflicts = 0
    for neighbor in graph.get_neighbors(station):
        if assignment.get(neighbor) == assignment.get(station):
            conflicts += 1
    return conflicts


def local_search(stations, frequencies, graph, max_steps=1000):
    """
    Local Search using Min-Conflicts heuristic.
    """
    # Step 1: Random initial assignment
    assignment = {}
    for s in stations:
        assignment[s] = random.choice(frequencies)

    # Step 2: Iterative improvement
    for _ in range(max_steps):
        conflicted_stations = []

        for s in stations:
            if count_conflicts(s, assignment, graph) > 0:
                conflicted_stations.append(s)

        # If no conflicts, solution found
        if not conflicted_stations:
            return assignment

        # Pick a conflicted station randomly
        station = random.choice(conflicted_stations)

        # Try all frequencies and pick the one with minimum conflicts
        best_freq = assignment[station]
        min_conflicts = count_conflicts(station, assignment, graph)

        for f in frequencies:
            assignment[station] = f
            conflicts = count_conflicts(station, assignment, graph)

            if conflicts < min_conflicts:
                min_conflicts = conflicts
                best_freq = f

        assignment[station] = best_freq

    # Return best found (may contain conflicts)
    return assignment
