# graph.py
# This file models the interference graph between base stations.
# Each base station is a node, and an edge represents interference.

class InterferenceGraph:
    def __init__(self):
        # Dictionary: station -> list of neighboring stations
        self.neighbors = {}

    def add_station(self, station):
        """
        Add a base station to the graph.
        """
        if station not in self.neighbors:
            self.neighbors[station] = []

    def add_interference(self, station1, station2):
        """
        Add an interference (undirected edge) between two stations.
        """
        self.neighbors[station1].append(station2)
        self.neighbors[station2].append(station1)

    def get_neighbors(self, station):
        """
        Return neighboring stations that cause interference.
        """
        return self.neighbors[station]

    def get_stations(self):
        """
        Return all base stations.
        """
        return list(self.neighbors.keys())
