
// Frequency Assignment visualization with fake-3D graph, 3D charts, and PDF export

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const PALETTE = [
    "#2b4c7e", "#3b7c6a", "#b08b4f", "#8b3f3f",
    "#5b6f7a", "#6d8a4f", "#a76f3d", "#3a6ea5"
  ];

  const CHART_COLORS = ["#2b4c7e", "#3b7c6a"];

  let latestData = null;
  let graphState = null;
  let seedDebounce = null;

  const numStations = $("numStations");
  const numFreqs = $("numFreqs");
  const prob = $("prob");
  const probLabel = $("probLabel");
  const algorithm = $("algorithm");
  const runBtn = $("runBtn");
  const status = $("status");

  const graphCanvas = $("graphCanvas");
  const graphMessage = $("graphMessage");
  const tooltip = $("tooltip");

  const colorBy = $("colorBy");
  const seeded = $("seeded");
  const seedValue = $("seedValue");
  const legend = $("legend");
  const downloadPdfBtn = $("downloadPdfBtn");

  const timeCanvas = $("timeCanvas");
  const conflictCanvas = $("conflictCanvas");
  const timeExplain = $("timeExplain");
  const conflictExplain = $("conflictExplain");

  const assignmentsTable = $("assignmentsTable");
  const assignmentExplain = $("assignmentExplain");

  const cspTime = $("cspTime");
  const cspConf = $("cspConf");
  const lsTime = $("lsTime");
  const lsConf = $("lsConf");

  probLabel.textContent = `(${Number(prob.value).toFixed(2)})`;
  prob.addEventListener("input", () => {
    probLabel.textContent = `(${Number(prob.value).toFixed(2)})`;
  });

  colorBy.addEventListener("change", () => {
    if (latestData) {
      renderGraph();
      updateAssignments(latestData);
      updateAssignmentExplain();
    }
  });

  seeded.addEventListener("change", () => {
    if (latestData) {
      graphState = buildGraphState(latestData);
      renderGraph();
    }
  });

  seedValue.addEventListener("input", () => {
    if (!latestData || !seeded.checked) return;
    if (seedDebounce) clearTimeout(seedDebounce);
    seedDebounce = setTimeout(() => {
      graphState = buildGraphState(latestData);
      renderGraph();
    }, 250);
  });
  runBtn.addEventListener("click", async () => {
    const validation = validateInputs();
    if (!validation.ok) {
      status.textContent = validation.message;
      return;
    }

    status.textContent = "Running experiment...";
    runBtn.disabled = true;
    clearVisuals("Running experiment...");

    const payload = {
      num_stations: validation.numStations,
      num_frequencies: validation.numFreqs,
      interference_prob: validation.prob,
      algorithm: algorithm.value
    };

    try {
      const res = await fetch("/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      latestData = data;

      updateMetrics(data);
      updateLegend(validation.numFreqs);
      updateChartExplanations(data);

      graphState = buildGraphState(data);
      renderGraph();

      drawCharts(data);
      updateAssignments(data);
      updateAssignmentExplain();

      status.textContent = "Experiment completed.";
    } catch (err) {
      console.error(err);
      status.textContent = "Error running experiment. Check inputs or backend status.";
      latestData = null;
      graphState = null;
    } finally {
      runBtn.disabled = false;
    }
  });

  downloadPdfBtn.addEventListener("click", async () => {
    if (!latestData || !graphState) {
      status.textContent = "Run the experiment before exporting the report.";
      return;
    }

    status.textContent = "Preparing PDF report...";
    downloadPdfBtn.disabled = true;

    try {
      renderGraph();
      drawCharts(latestData);
      await waitForCanvasRender();

      const graphImage = canvasToJpeg(graphCanvas);
      const timeImage = canvasToJpeg(timeCanvas);
      const conflictImage = canvasToJpeg(conflictCanvas);

      const pdfBytes = buildPdfReport({
        data: latestData,
        graphImage,
        timeImage,
        conflictImage
      });

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "frequency_assignment_results.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      status.textContent = "PDF downloaded successfully.";
    } catch (err) {
      console.error(err);
      status.textContent = "PDF export failed. Try again.";
    } finally {
      downloadPdfBtn.disabled = false;
    }
  });
  window.addEventListener("resize", () => {
    if (!latestData) return;
    renderGraph();
    drawCharts(latestData);
  });

  graphCanvas.addEventListener("mousemove", (event) => {
    if (!graphState || !graphState.projected) return;

    const rect = graphCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = findHitNode(x, y, graphState.projected);
    const nextHover = hit ? hit.id : null;

    if (nextHover !== graphState.hoverId) {
      graphState.hoverId = nextHover;
      renderGraph();
    }

    if (hit) {
      showTooltip(hit, x, y);
    } else {
      hideTooltip();
    }
  });

  graphCanvas.addEventListener("mouseleave", () => {
    if (graphState) {
      graphState.hoverId = null;
      renderGraph();
    }
    hideTooltip();
  });

  function validateInputs() {
    const stations = Number.parseInt(numStations.value, 10);
    const freqs = Number.parseInt(numFreqs.value, 10);
    const p = Number.parseFloat(prob.value);

    if (!Number.isFinite(stations) || stations < 1) {
      return { ok: false, message: "Number of stations must be at least 1." };
    }
    if (!Number.isFinite(freqs) || freqs < 1) {
      return { ok: false, message: "Number of frequencies must be at least 1." };
    }
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return { ok: false, message: "Interference probability must be between 0 and 1." };
    }
    if (!["compare", "csp", "local"].includes(algorithm.value)) {
      return { ok: false, message: "Select a valid algorithm." };
    }

    return {
      ok: true,
      numStations: stations,
      numFreqs: freqs,
      prob: p
    };
  }

  function clearVisuals(message) {
    graphMessage.textContent = message || "";
    graphMessage.style.display = message ? "block" : "none";
    hideTooltip();

    clearCanvas(graphCanvas);
    clearCanvas(timeCanvas);
    clearCanvas(conflictCanvas);

    legend.innerHTML = "";
    assignmentsTable.querySelector("tbody").innerHTML = "";
    timeExplain.textContent = "Run the experiment to compute execution time comparisons.";
    conflictExplain.textContent = "Run the experiment to compare conflict counts.";
    assignmentExplain.textContent = "Assignments appear after running the experiment.";
  }

  function updateMetrics(data) {
    cspTime.textContent = formatTime(data.csp_time);
    cspConf.textContent = formatCount(data.csp_conflicts);
    lsTime.textContent = formatTime(data.local_time);
    lsConf.textContent = formatCount(data.local_conflicts);
  }

  function updateLegend(freqCount) {
    legend.innerHTML = "";
    for (let i = 1; i <= freqCount; i += 1) {
      const swatch = document.createElement("div");
      swatch.className = "legend-swatch";
      swatch.style.background = colorForFrequency(i);
      swatch.textContent = `f=${i}`;
      legend.appendChild(swatch);
    }
  }

  function updateAssignments(data) {
    const tbody = assignmentsTable.querySelector("tbody");
    tbody.innerHTML = "";
    const visualLabel = colorBy.value === "csp" ? "CSP" : "Local";

    data.stations.forEach((station) => {
      const row = document.createElement("tr");
      const cspVal = resolveAssignment(data.csp_assignment, station);
      const localVal = resolveAssignment(data.local_assignment, station);

      row.innerHTML = `
        <td>S${station}</td>
        <td>${cspVal ?? "--"}</td>
        <td>${localVal ?? "--"}</td>
        <td>${visualLabel}</td>
      `;
      tbody.appendChild(row);
    });
  }

  function updateAssignmentExplain() {
    const visualLabel = colorBy.value === "csp" ? "CSP" : "Local Search";
    assignmentExplain.textContent = `Visualized assignment: ${visualLabel}. Table updates automatically when the selection changes.`;
  }

  function updateChartExplanations(data) {
    const csp = Number.isFinite(data.csp_time) ? data.csp_time : null;
    const local = Number.isFinite(data.local_time) ? data.local_time : null;

    if (csp !== null && local !== null) {
      if (csp > local) {
        timeExplain.textContent = "CSP explores the search space exhaustively, which explains higher execution time; Local Search converges faster through heuristics.";
      } else {
        timeExplain.textContent = "Local Search required more iterations in this instance, while CSP benefited from pruning under lighter constraints.";
      }
    }

    const cspConflicts = Number.isFinite(data.csp_conflicts) ? data.csp_conflicts : null;
    const localConflicts = Number.isFinite(data.local_conflicts) ? data.local_conflicts : null;

    if (cspConflicts !== null && localConflicts !== null) {
      if (cspConflicts <= localConflicts) {
        conflictExplain.textContent = "CSP aims for consistency, often achieving fewer conflicts. Local Search may accept residual conflicts to remain fast.";
      } else {
        conflictExplain.textContent = "Local Search reduced conflicts effectively here, while CSP could not fully eliminate them under constraints.";
      }
    }
  }
  function drawCharts(data) {
    draw3DBarChart(timeCanvas, {
      title: "Execution Time (s)",
      yLabel: "Time (seconds)",
      labels: ["CSP", "Local"],
      values: [data.csp_time, data.local_time]
    });

    draw3DBarChart(conflictCanvas, {
      title: "Conflict Count",
      yLabel: "Conflicts",
      labels: ["CSP", "Local"],
      values: [data.csp_conflicts, data.local_conflicts]
    });
  }

  function draw3DBarChart(canvas, config) {
    const ctx = resizeCanvas(canvas);
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 34, right: 18, bottom: 44, left: 54 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    ctx.font = "600 14px 'Gill Sans MT', 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#0b1324";
    ctx.fillText(config.title, margin.left, 20);

    const values = config.values.map((v) => (Number.isFinite(v) ? v : 0));
    const maxValue = Math.max(...values, 1);

    const tickCount = 4;
    ctx.font = "12px 'Trebuchet MS', 'Verdana', sans-serif";

    for (let i = 0; i <= tickCount; i += 1) {
      const t = i / tickCount;
      const y = margin.top + chartHeight - t * chartHeight;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();

      ctx.fillStyle = "#5f6c7b";
      const val = formatAxisValue(maxValue * t);
      ctx.fillText(val, 8, y + 4);
    }

    ctx.strokeStyle = "rgba(15, 23, 42, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();

    ctx.save();
    ctx.translate(16, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#5f6c7b";
    ctx.fillText(config.yLabel, 0, 0);
    ctx.restore();

    ctx.fillStyle = "#5f6c7b";
    ctx.fillText("Algorithm", margin.left + chartWidth - 70, margin.top + chartHeight + 30);

    const barWidth = Math.min(80, chartWidth / (config.labels.length * 2.2));
    const gap = (chartWidth - barWidth * config.labels.length) / (config.labels.length + 1);
    const depth = Math.min(12, barWidth * 0.2);

    config.labels.forEach((label, i) => {
      const value = Number.isFinite(config.values[i]) ? config.values[i] : 0;
      const barHeight = (value / maxValue) * (chartHeight - 6);
      const x = margin.left + gap + i * (barWidth + gap);
      const y = margin.top + chartHeight - barHeight;
      const color = CHART_COLORS[i % CHART_COLORS.length];

      draw3DBar(ctx, x, y, barWidth, barHeight, depth, color);

      const labelText = Number.isFinite(config.values[i]) ? formatValue(config.values[i]) : "n/a";
      ctx.fillStyle = "#0b1324";
      ctx.fillText(labelText, x + barWidth / 2 - ctx.measureText(labelText).width / 2, y - 6);

      ctx.fillText(label, x + barWidth / 2 - ctx.measureText(label).width / 2, margin.top + chartHeight + 18);
    });
  }

  function draw3DBar(ctx, x, y, width, height, depth, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = darkenColor(color, 0.25);
    ctx.beginPath();
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width + depth, y - depth);
    ctx.lineTo(x + width + depth, y + height - depth);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = lightenColor(color, 0.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + depth, y - depth);
    ctx.lineTo(x + width + depth, y - depth);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    ctx.fill();
  }
  function buildGraphState(data) {
    const nodes = data.stations.map((s) => String(s));
    const edges = (data.graph_edges || []).map(([u, v]) => [String(u), String(v)]);
    const adjacency = new Map();

    nodes.forEach((id) => adjacency.set(id, new Set()));
    edges.forEach(([u, v]) => {
      adjacency.get(u)?.add(v);
      adjacency.get(v)?.add(u);
    });

    const rng = seeded.checked ? createSeededRng(seedValue.value.trim() || "default") : Math.random;
    const positions = buildLayout(nodes, edges, adjacency, rng);

    return {
      nodes,
      edges,
      adjacency,
      positions,
      hoverId: null,
      projected: null
    };
  }

  function buildLayout(nodeIds, edges, adjacency, rng) {
    const count = nodeIds.length || 1;
    const nodes = nodeIds.map((id, i) => {
      const angle = (2 * Math.PI * i) / count;
      const radius = 1 + rng() * 0.15;
      return {
        id,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: 0,
        vx: 0,
        vy: 0
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const k = Math.sqrt(6 / count);
    const iterations = Math.min(140, 40 + count * 4);

    for (let iter = 0; iter < iterations; iter += 1) {
      nodes.forEach((node) => {
        node.fx = 0;
        node.fy = 0;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy) + 0.001;
          const force = (k * k) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.fx += fx;
          a.fy += fy;
          b.fx -= fx;
          b.fy -= fy;
        }
      }

      edges.forEach(([u, v]) => {
        const a = nodeMap.get(u);
        const b = nodeMap.get(v);
        if (!a || !b) return;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) + 0.001;
        const force = (dist * dist) / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.fx -= fx;
        a.fy -= fy;
        b.fx += fx;
        b.fy += fy;
      });

      const temp = 0.12 * (1 - iter / iterations);
      nodes.forEach((node) => {
        node.vx = (node.vx + node.fx) * 0.55;
        node.vy = (node.vy + node.fy) * 0.55;
        node.x += node.vx * temp;
        node.y += node.vy * temp;
      });
    }

    const maxR = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y)), 1);
    const scale = 1.2 / maxR;
    nodes.forEach((node) => {
      node.x *= scale;
      node.y *= scale;
    });

    const degrees = nodes.map((node) => adjacency.get(node.id)?.size || 0);
    const minDeg = Math.min(...degrees);
    const maxDeg = Math.max(...degrees);

    nodes.forEach((node, idx) => {
      const deg = degrees[idx];
      const norm = maxDeg === minDeg ? 0.5 : (deg - minDeg) / (maxDeg - minDeg);
      const depth = (0.55 - norm) * 0.9;
      node.z = clamp(depth + (rng() - 0.5) * 0.2, -0.9, 0.9);
    });

    const minDist = 0.28;
    for (let iter = 0; iter < 30; iter += 1) {
      let moved = false;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy) + 0.001;
          if (dist < minDist) {
            const push = (minDist - dist) / dist * 0.5;
            a.x += dx * push;
            a.y += dy * push;
            b.x -= dx * push;
            b.y -= dy * push;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    return nodes;
  }
  function renderGraph() {
    if (!graphState) return;

    const ctx = resizeCanvas(graphCanvas);
    const width = graphCanvas.clientWidth || graphCanvas.width;
    const height = graphCanvas.clientHeight || graphCanvas.height;

    ctx.clearRect(0, 0, width, height);
    drawGraphBackground(ctx, width, height);

    if (graphState.nodes.length === 0) {
      graphMessage.textContent = "No stations returned.";
      graphMessage.style.display = "block";
      return;
    }

    if (graphState.edges.length === 0) {
      graphMessage.textContent = "No interference constraints generated";
      graphMessage.style.display = "block";
    } else {
      graphMessage.style.display = "none";
    }

    const depth = 2.6;
    const scale = Math.min(width, height) * 0.44;
    const centerX = width / 2;
    const centerY = height / 2;

    const projected = graphState.positions.map((node) => {
      const inv = 1 / (node.z + depth);
      return {
        id: node.id,
        x: centerX + node.x * scale * inv,
        y: centerY + node.y * scale * inv,
        r: Math.max(5, 15 * inv),
        inv,
        z: node.z
      };
    });

    const invValues = projected.map((p) => p.inv);
    const minInv = Math.min(...invValues);
    const maxInv = Math.max(...invValues);

    const projMap = new Map(projected.map((p) => [p.id, p]));
    const hoverId = graphState.hoverId;
    const neighborSet = hoverId ? graphState.adjacency.get(hoverId) : null;

    graphState.projected = projected
      .slice()
      .sort((a, b) => b.inv - a.inv);

    graphState.edges.forEach(([u, v]) => {
      const a = projMap.get(u);
      const b = projMap.get(v);
      if (!a || !b) return;
      const depthInv = (a.inv + b.inv) / 2;
      const depthNorm = (depthInv - minInv) / (maxInv - minInv + 0.0001);
      const lineWidth = 0.7 + depthNorm * 2.2;
      let alpha = 0.18 + depthNorm * 0.38;
      let color = `rgba(15, 23, 42, ${alpha})`;

      if (hoverId) {
        if (u === hoverId || v === hoverId) {
          color = "rgba(30, 99, 152, 0.9)";
        } else {
          alpha *= 0.18;
          color = `rgba(15, 23, 42, ${alpha})`;
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    projected
      .slice()
      .sort((a, b) => a.inv - b.inv)
      .forEach((node) => {
        const freq = getFrequency(node.id);
        const baseColor = freq ? colorForFrequency(freq) : "#cbd5e1";
        const isHover = hoverId === node.id;
        const isNeighbor = hoverId && neighborSet && neighborSet.has(node.id);
        drawSphere(ctx, node.x, node.y, node.r, baseColor, isHover, isNeighbor);
      });
  }

  function drawGraphBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
      width * 0.3,
      height * 0.2,
      width * 0.1,
      width / 2,
      height / 2,
      width * 0.6
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#eef2f7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawSphere(ctx, x, y, r, color, isHover, isNeighbor) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 0.9, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const gradient = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
    gradient.addColorStop(0, lightenColor(color, 0.5));
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, darkenColor(color, 0.45));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    if (isNeighbor || isHover) {
      ctx.strokeStyle = isHover ? "rgba(247, 150, 70, 0.95)" : "rgba(30, 99, 152, 0.75)";
      ctx.lineWidth = isHover ? 2.6 : 1.8;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function findHitNode(x, y, nodes) {
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.hypot(dx, dy) <= node.r + 4) return node;
    }
    return null;
  }

  function showTooltip(node, x, y) {
    if (!latestData) return;
    const freq = getFrequency(node.id);
    const neighbors = graphState?.adjacency.get(node.id)?.size ?? 0;

    tooltip.innerHTML = `
      <div><strong>Station S${node.id}</strong></div>
      <div>Frequency: ${freq ?? "--"}</div>
      <div>Interfering neighbors: ${neighbors}</div>
    `;

    tooltip.style.left = `${x + 14}px`;
    tooltip.style.top = `${y + 14}px`;
    tooltip.style.display = "block";
    tooltip.setAttribute("aria-hidden", "false");
  }

  function hideTooltip() {
    tooltip.style.display = "none";
    tooltip.setAttribute("aria-hidden", "true");
  }

  function getFrequency(id) {
    if (!latestData) return null;
    const assignment = colorBy.value === "csp" ? latestData.csp_assignment : latestData.local_assignment;
    return resolveAssignment(assignment, id);
  }

  function resolveAssignment(assignment, id) {
    if (!assignment) return null;
    return assignment[id] ?? assignment[String(id)] ?? assignment[Number(id)] ?? null;
  }

  function colorForFrequency(freq) {
    const index = (freq - 1) % PALETTE.length;
    const base = PALETTE[index];
    const layer = Math.floor((freq - 1) / PALETTE.length);
    if (layer === 0) return base;
    return lightenColor(base, Math.min(0.4, layer * 0.12));
  }
  function formatTime(value) {
    return Number.isFinite(value) ? `${value.toFixed(3)} s` : "--";
  }

  function formatCount(value) {
    return Number.isFinite(value) ? String(value) : "--";
  }

  function formatAxisValue(value) {
    if (value >= 10) return value.toFixed(0);
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(2);
  }

  function formatValue(value) {
    if (Number.isInteger(value)) return String(value);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(3);
  }

  function clearCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function createSeededRng(seedText) {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i += 1) {
      seed ^= seedText.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    return mulberry32(seed >>> 0);
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lightenColor(hex, amount) {
    return mixColor(hex, "#ffffff", amount);
  }

  function darkenColor(hex, amount) {
    return mixColor(hex, "#000000", amount);
  }

  function mixColor(hex, target, amount) {
    const base = hexToRgb(hex);
    const dest = hexToRgb(target);
    const r = Math.round(base.r + (dest.r - base.r) * amount);
    const g = Math.round(base.g + (dest.g - base.g) * amount);
    const b = Math.round(base.b + (dest.b - base.b) * amount);
    return rgbToHex(r, g, b);
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
    const num = Number.parseInt(value, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (c) => c.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function waitForCanvasRender() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  function canvasToJpeg(canvas) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, width: canvas.width, height: canvas.height };
  }
  function buildPdfReport({ data, graphImage, timeImage, conflictImage }) {
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 54;

    const pdf = new PdfBuilder();
    const fontRegular = pdf.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBold = pdf.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const graphObj = pdf.addStream(
      `/Type /XObject /Subtype /Image /Width ${graphImage.width} /Height ${graphImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      graphImage.bytes
    );
    const timeObj = pdf.addStream(
      `/Type /XObject /Subtype /Image /Width ${timeImage.width} /Height ${timeImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      timeImage.bytes
    );
    const conflictObj = pdf.addStream(
      `/Type /XObject /Subtype /Image /Width ${conflictImage.width} /Height ${conflictImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      conflictImage.bytes
    );

    const pagesObj = pdf.reserveObject();
    const catalogObj = pdf.reserveObject();

    const titleContent = buildTitlePage({
      data,
      pageWidth,
      pageHeight,
      margin
    });
    const titleStream = pdf.addStream("", new TextEncoder().encode(titleContent));

    const graphContent = buildImagePage({
      title: "Interference Graph (3D)",
      explanation: buildGraphExplanation(data),
      imageName: "ImGraph",
      image: graphImage,
      pageWidth,
      pageHeight,
      margin
    });
    const graphStream = pdf.addStream("", new TextEncoder().encode(graphContent));

    const timeContent = buildImagePage({
      title: "Execution Time (CSP vs Local)",
      explanation: timeExplain.textContent,
      imageName: "ImTime",
      image: timeImage,
      pageWidth,
      pageHeight,
      margin
    });
    const timeStream = pdf.addStream("", new TextEncoder().encode(timeContent));

    const conflictContent = buildImagePage({
      title: "Conflict Count (CSP vs Local)",
      explanation: conflictExplain.textContent,
      imageName: "ImConflict",
      image: conflictImage,
      pageWidth,
      pageHeight,
      margin
    });
    const conflictStream = pdf.addStream("", new TextEncoder().encode(conflictContent));

    const tableContent = buildTablePage({
      data,
      pageWidth,
      pageHeight,
      margin
    });
    const tableStream = pdf.addStream("", new TextEncoder().encode(tableContent));

    const page1 = pdf.addObject(pageObject(pageWidth, pageHeight, pagesObj, titleStream, fontRegular, fontBold, null));
    const page2 = pdf.addObject(pageObject(pageWidth, pageHeight, pagesObj, graphStream, fontRegular, fontBold, {
      ImGraph: graphObj
    }));
    const page3 = pdf.addObject(pageObject(pageWidth, pageHeight, pagesObj, timeStream, fontRegular, fontBold, {
      ImTime: timeObj
    }));
    const page4 = pdf.addObject(pageObject(pageWidth, pageHeight, pagesObj, conflictStream, fontRegular, fontBold, {
      ImConflict: conflictObj
    }));
    const page5 = pdf.addObject(pageObject(pageWidth, pageHeight, pagesObj, tableStream, fontRegular, fontBold, null));

    pdf.setObject(
      pagesObj,
      `<< /Type /Pages /Count 5 /Kids [${page1} 0 R ${page2} 0 R ${page3} 0 R ${page4} 0 R ${page5} 0 R] >>`
    );
    pdf.setObject(catalogObj, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

    return pdf.build(catalogObj);
  }

  function buildTitlePage({ data, pageWidth, pageHeight, margin }) {
    const lines = [];
    const startY = pageHeight - margin - 10;

    lines.push(pdfText("Frequency Assignment using CSP Backtracking and Local Search", margin, startY, 22, "F2"));
    lines.push(pdfText("Academic 3D visualization report", margin, startY - 26, 12, "F1"));

    const details = [
      `Stations: ${data.stations.length}`,
      `Frequencies: ${Object.keys(data.csp_assignment || {}).length || Object.keys(data.local_assignment || {}).length || "--"}`,
      `Interference probability: ${Number.isFinite(data.interference_prob) ? data.interference_prob.toFixed(2) : "--"}`,
      `CSP time: ${formatTime(data.csp_time)}`,
      `Local search time: ${formatTime(data.local_time)}`,
      `CSP conflicts: ${formatCount(data.csp_conflicts)}`,
      `Local conflicts: ${formatCount(data.local_conflicts)}`
    ];

    let y = startY - 70;
    details.forEach((text) => {
      lines.push(pdfText(text, margin, y, 12, "F1"));
      y -= 18;
    });

    const summary = "This report compares exact CSP backtracking with heuristic local search on a generated interference graph. The visualization emphasizes depth, constraints, and algorithm trade-offs.";
    const summaryLines = wrapText(summary, pageWidth - margin * 2, 12);
    y -= 10;
    summaryLines.forEach((text) => {
      lines.push(pdfText(text, margin, y, 12, "F1"));
      y -= 16;
    });

    return lines.join("");
  }

  function buildImagePage({ title, explanation, imageName, image, pageWidth, pageHeight, margin }) {
    const lines = [];
    const topY = pageHeight - margin - 10;
    lines.push(pdfText(title, margin, topY, 18, "F2"));

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = 320;
    const dims = fitImage(image.width, image.height, availableWidth, availableHeight);
    const x = (pageWidth - dims.width) / 2;
    const yTop = topY - 30;
    const y = yTop - dims.height;

    lines.push(`q ${dims.width} 0 0 ${dims.height} ${x} ${y} cm /${imageName} Do Q\n`);

    const paragraphY = y - 24;
    const paragraphLines = wrapText(explanation, pageWidth - margin * 2, 12);
    let textY = paragraphY;
    paragraphLines.forEach((text) => {
      lines.push(pdfText(text, margin, textY, 12, "F1"));
      textY -= 16;
    });

    return lines.join("");
  }

  function buildTablePage({ data, pageWidth, pageHeight, margin }) {
    const lines = [];
    const startY = pageHeight - margin - 10;
    lines.push(pdfText("Assignments Table (CSP vs Local)", margin, startY, 18, "F2"));

    const tableTop = startY - 30;
    const rowHeight = 18;
    const colX = [margin, margin + 140, margin + 300, margin + 460];

    lines.push(pdfLine(margin, tableTop + 6, pageWidth - margin, tableTop + 6));
    lines.push(pdfText("Station", colX[0] + 2, tableTop, 12, "F2"));
    lines.push(pdfText("CSP Frequency", colX[1] + 2, tableTop, 12, "F2"));
    lines.push(pdfText("Local Frequency", colX[2] + 2, tableTop, 12, "F2"));
    lines.push(pdfText("Visualized", colX[3] + 2, tableTop, 12, "F2"));

    let y = tableTop - rowHeight;
    const visualLabel = colorBy.value === "csp" ? "CSP" : "Local";

    data.stations.forEach((station) => {
      const cspVal = resolveAssignment(data.csp_assignment, station) ?? "--";
      const localVal = resolveAssignment(data.local_assignment, station) ?? "--";
      lines.push(pdfText(`S${station}`, colX[0] + 2, y, 11, "F1"));
      lines.push(pdfText(String(cspVal), colX[1] + 2, y, 11, "F1"));
      lines.push(pdfText(String(localVal), colX[2] + 2, y, 11, "F1"));
      lines.push(pdfText(visualLabel, colX[3] + 2, y, 11, "F1"));
      y -= rowHeight;
    });

    const tableBottom = y + rowHeight;
    lines.push(pdfLine(margin, tableBottom, pageWidth - margin, tableBottom));
    colX.forEach((x) => {
      lines.push(pdfLine(x, tableBottom, x, tableTop + 6));
    });
    lines.push(pdfLine(pageWidth - margin, tableBottom, pageWidth - margin, tableTop + 6));

    return lines.join("");
  }

  function pageObject(width, height, parentId, contentsId, fontRegularId, fontBoldId, xObjects) {
    let resources = `/Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >>`;
    if (xObjects) {
      const entries = Object.entries(xObjects)
        .map(([key, id]) => `/${key} ${id} 0 R`)
        .join(" ");
      resources += ` /XObject << ${entries} >>`;
    }
    return `<< /Type /Page /Parent ${parentId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << ${resources} >> /Contents ${contentsId} 0 R >>`;
  }

  function pdfText(text, x, y, size, font) {
    return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(text)}) Tj ET\n`;
  }

  function pdfLine(x1, y1, x2, y2) {
    return `${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  function escapePdf(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function wrapText(text, maxWidth, fontSize) {
    const words = text.split(/\s+/);
    const approxCharWidth = fontSize * 0.55;
    const maxChars = Math.max(1, Math.floor(maxWidth / approxCharWidth));
    const lines = [];
    let line = "";

    words.forEach((word) => {
      if ((line + " " + word).trim().length > maxChars) {
        if (line) lines.push(line.trim());
        line = word;
      } else {
        line = `${line} ${word}`;
      }
    });

    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function buildGraphExplanation(data) {
    if (!data.graph_edges || data.graph_edges.length === 0) {
      return "No interference constraints were generated, so stations appear isolated. The layout still shows depth cues and station positions.";
    }
    return "Edges encode interference constraints between stations. Larger, closer nodes emphasize depth and highlight central stations with higher constraint connectivity.";
  }

  function fitImage(width, height, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    };
  }
  class PdfBuilder {
    constructor() {
      this.objects = [];
    }

    addObject(content) {
      this.objects.push({ parts: [content] });
      return this.objects.length;
    }

    reserveObject() {
      this.objects.push(null);
      return this.objects.length;
    }

    setObject(index, content) {
      this.objects[index - 1] = { parts: [content] };
    }

    addStream(dict, bytes) {
      const header = `<< ${dict} /Length ${bytes.length} >>\nstream\n`;
      const footer = "\nendstream";
      this.objects.push({ parts: [header, bytes, footer] });
      return this.objects.length;
    }

    build(rootId) {
      const encoder = new TextEncoder();
      const chunks = [];
      const offsets = [0];
      let offset = 0;

      const push = (part) => {
        const bytes = typeof part === "string" ? encoder.encode(part) : part;
        chunks.push(bytes);
        offset += bytes.length;
      };

      push("%PDF-1.4\n");

      for (let i = 0; i < this.objects.length; i += 1) {
        const obj = this.objects[i];
        if (!obj) throw new Error("PDF object not set");
        offsets[i + 1] = offset;
        push(`${i + 1} 0 obj\n`);
        obj.parts.forEach((part) => push(part));
        push("\nendobj\n");
      }

      const xrefOffset = offset;
      push(`xref\n0 ${this.objects.length + 1}\n`);
      push("0000000000 65535 f \n");

      for (let i = 1; i <= this.objects.length; i += 1) {
        const padded = String(offsets[i]).padStart(10, "0");
        push(`${padded} 00000 n \n`);
      }

      push(`trailer\n<< /Size ${this.objects.length + 1} /Root ${rootId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const output = new Uint8Array(totalLength);
      let position = 0;
      chunks.forEach((chunk) => {
        output.set(chunk, position);
        position += chunk.length;
      });
      return output;
    }
  }
});
