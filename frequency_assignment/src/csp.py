import time

# csp.py
# This file implements CSP Backtracking for frequency assignment.


class CSPTimeoutError(Exception):
    """Raised when CSP exceeds its allotted time budget."""


def is_consistent(station, frequency, assignment, graph):
    """
    Check if assigning 'frequency' to 'station' violates constraints.
    """
    for neighbor in graph.get_neighbors(station):
        if neighbor in assignment and assignment[neighbor] == frequency:
            return False
    return True


def backtracking(assignment, stations, frequencies, graph, max_seconds=None, start_time=None):
    """
    Backtracking search for CSP.

    CSP is exponential in the number of stations, so a time limit keeps the
    application responsive for large instances.
    """
    if max_seconds is not None:
        if start_time is None:
            start_time = time.perf_counter()
        if (time.perf_counter() - start_time) >= max_seconds:
            raise CSPTimeoutError()
    # If all stations are assigned, return solution
    if len(assignment) == len(stations):
        return assignment

    # Select the first unassigned station
    for station in stations:
        if station not in assignment:
            current_station = station
            break

    # Try all frequencies
    for freq in frequencies:
        if is_consistent(current_station, freq, assignment, graph):
            assignment[current_station] = freq

            result = backtracking(
                assignment,
                stations,
                frequencies,
                graph,
                max_seconds=max_seconds,
                start_time=start_time
            )
            if result is not None:
                return result

            # Backtrack
            del assignment[current_station]

    return None
