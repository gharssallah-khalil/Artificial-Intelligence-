# Project Title
Frequency Assignment using CSP Backtracking and Local Search

## Project Overview
I study the Frequency Assignment Problem (FAP), where I must assign a limited set of radio frequencies to base stations so that interfering stations do not share the same frequency. I implemented an exact CSP backtracking solver and a heuristic Local Search solver, and I present the results through a web-based visualization interface that includes a 3D interference graph, comparative charts, and an automated PDF report.

## Project Structure
```
project_root/
|-- app.py
|-- README.md
|-- src/
|   |-- __init__.py
|   |-- csp.py
|   |-- local_search.py
|   |-- graph.py
|   `-- main.py
|-- static/
|   |-- style.css
|   `-- script.js
|-- templates/
|   `-- index.html
`-- samples/
    |-- sample_run.json
    |-- screenshot_graph.png
    `-- screenshot_charts.png
```

I organize the repository as follows:
- `app.py`: I use this as the Flask entry point that serves the UI and exposes the `POST /run` API.
- `src/__init__.py`: I keep this file to mark `src` as a Python package.
- `src/csp.py`: I implement CSP backtracking for exact assignments.
- `src/local_search.py`: I implement the min-conflicts local search algorithm.
- `src/graph.py`: I define the interference graph data structure.
- `src/main.py`: I use this as a standalone analysis script with Matplotlib visualizations.
- `static/`: I store CSS and JavaScript for the web UI, graph rendering, and PDF export.
- `templates/index.html`: I define the main HTML template for the dashboard.
- `samples/`: I store example JSON output and screenshots for documentation.

## Requirements
I run the project with the following requirements:
- Python 3.8 or newer
- Flask
- Matplotlib (required only for `src/main.py`)

## Installation
I install the project in three steps.
1) Create a virtual environment:
```powershell
python -m venv .venv
```

2) Activate the environment (Windows PowerShell):
```powershell
. .venv\Scripts\Activate.ps1
```

3) Install dependencies:
```powershell
pip install flask matplotlib
```

## Running the Project
1) I start the Flask server:
```powershell
python app.py
```

2) I open the web interface:
```
http://127.0.0.1:5000
```

In the browser I see the academic dashboard with the input controls, the 3D interference graph, execution time and conflict charts, and the assignments table.

## Using the Web Interface
I control experiments with these inputs:
- Number of Stations: the number of base stations (graph nodes).
- Number of Frequencies: the available frequency labels for assignment.
- Interference Probability: the likelihood that any two stations interfere, which controls graph density.

I use these controls and outputs during each run:
- Algorithm Selection: I choose CSP, Local Search, or Compare Both.
- Run Experiment: triggers `POST /run` and updates the graph, charts, assignments table, and summary metrics.
- Visualize assignment: switches node colors between CSP and Local Search assignments.
- Download Results Report (PDF): exports a compact report containing graphs, charts, and explanations.

## Understanding the Results
I interpret the results as follows:
- Execution time comparison: I expect CSP to be slower on larger graphs because it explores the search space systematically, while Local Search is faster due to heuristic updates.
- Conflict comparison: I expect CSP to achieve zero conflicts when a feasible assignment exists, whereas Local Search may retain residual conflicts.
- Interference graph: I read nodes as base stations and edges as interference constraints; dense graphs indicate harder instances.
- Why results differ: I treat CSP as exact and exhaustive, while Local Search is heuristic and can settle in local minima; random graph generation also affects outcomes.

## Sample Outputs
I provide sample artifacts in `samples/`:
- `samples/sample_run.json`: a realistic example of the API response, including stations, frequencies, edges, assignments, timings, and conflicts.
- `samples/screenshot_graph.png`: a screenshot of the rendered 3D interference graph.
- `samples/screenshot_charts.png`: a screenshot of the execution time and conflict charts.

## Report Generation
I generate the report by clicking "Download Results Report (PDF)." The web interface creates a compact experimental report that includes the graph visualization, charts, and an assignments summary. The PDF is built client-side from the current dashboard state.

## Limitations
I note the following limitations:
- CSP scalability: backtracking is exponential, and the web demo caps CSP evaluation to keep response times reasonable.
- Local Search heuristic: the min-conflicts strategy is not guaranteed to find a conflict-free solution.
- Random graph generation: results vary across runs because edges are sampled probabilistically.


