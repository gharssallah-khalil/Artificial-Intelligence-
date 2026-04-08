# Artificial-Intelligence-
Frequency Assignment
# 📡 AI Frequency Assignment Optimizer

![Python Version](https://img.shields.io/badge/Python-3.9%2B-blue.svg)
![Domain](https://img.shields.io/badge/Domain-Artificial%20Intelligence%20%7C%20Optimization-orange.svg)
![Algorithm](https://img.shields.io/badge/Algorithms-CSP%20%7C%20Local%20Search-green.svg)
![Institution](https://img.shields.io/badge/Institution-Beykoz%20University-red.svg)

## 📖 Overview
The **Frequency Assignment Optimizer** is an Artificial Intelligence-driven project designed to solve the complex Frequency Assignment Problem (FAP) in wireless networks. Developed for the *Advanced Artificial Intelligence* Master's course, this system models the challenge of assigning radio frequencies to communication links as a **Constraint Satisfaction Problem (CSP)**.

The primary goal is to allocate frequencies efficiently while strictly avoiding electromagnetic interference between neighboring transmitters, utilizing advanced graph-theoretic representations and AI search paradigms.

## ✨ Key Features
* **Dual AI Solvers:** Implements both exact and heuristic-based AI algorithms to compare performance and scalability.
* **Constraint Satisfaction Modeling:** Effectively maps real-world frequency constraints (hard constraints and conflict functions) into a rigorous graph-theoretic model.
* **Interactive Visualization:** Includes a visualization system to render the network graph, making it easier to interpret frequency distributions and identify residual conflicts visually.
* **Modular Architecture:** Cleanly separates the theoretical mathematical formulation from the practical code implementation.

## 🧠 Implemented Algorithms

### 1. Backtracking Search (CSP)
* **Approach:** A systematic, depth-first search that builds a solution incrementally.
* **Strengths:** Guarantees a conflict-free assignment if one exists (complete algorithm).
* **Use Case:** Ideal for smaller, tightly constrained networks where absolute precision and zero interference are mandatory.

### 2. Local Search (Min-Conflicts Heuristic)
* **Approach:** Starts with a complete, potentially flawed assignment, and iteratively repairs conflicts by reassigning frequencies to nodes involved in the most violations.
* **Strengths:** Highly scalable and computationally efficient for large-scale networks.
* **Use Case:** Best suited for massive, dense networks where finding a "good enough" configuration quickly is prioritized over guaranteed perfection.

## 🚀 Future Enhancements
While the current implementation successfully balances theoretical frameworks with practical problem-solving, future directions for this repository include:
* **Meta-Heuristics Integration:** Implementing Genetic Algorithms (GA) or Simulated Annealing to further decrease residual conflicts and escape local optima.
* **Real-World Datasets:** Integrating actual telecommunication and wireless network data to increase the practical relevance of the solver.
* **Hybrid Approaches:** Combining CSP for partial, strict assignments with Local Search for broader network refinement.
* **Enhanced Analytics:** Upgrading the visualization system with real-time animation of the algorithm's decision-making process.

## 🎓 Author & Academic Context
* **Khalil Gharssallah** 
* **Course:** Advanced Artificial Intelligence (2025/2026)
* **Department:** Master of Computer Engineering, Beykoz University
  

---
*If you find this AI optimization project useful for your research or studies, please consider giving it a ⭐!*
