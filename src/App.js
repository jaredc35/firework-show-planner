// src/App.js
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import {
  subscribeFireworks, addFirework, updateFirework, deleteFirework,
  subscribeShows, addShow, updateShow, deleteShow,
  subscribeShowItems, addShowItem, updateShowItem, deleteShowItem,
} from './firebase/firestoreService';
import Login from './components/Login';

// ─── Constants ────────────────────────────────────────────────────────────────
const FIREWORK_TYPES = [
  "Cake", "Rocket", "Shells", "Sequencer", "Fireball", "Fountains"
];

const FIREWORK_DEFAULTS = {
  Cake:      { fuse_duration: 0, air_travel_time: 2, duration: 0 },
  Rocket:    { fuse_duration: 2, air_travel_time: 2, duration: 0 },
  Shells:    { fuse_duration: 0, air_travel_time: 0, duration: 0 },
  Sequencer: { fuse_duration: 0, air_travel_time: 0, duration: 0 },
  Fireball:  { fuse_duration: 0, air_travel_time: 0, duration: 0 },
  Fountains: { fuse_duration: 0, air_travel_time: 0, duration: 0 },
};

const TYPE_COLORS = {
  Cake:      { bg: "#ff6b35", fg: "#fff", track: "#ff6b3544" },
  Rocket:    { bg: "#e63946", fg: "#fff", track: "#e6394644" },
  Shells:    { bg: "#457b9d", fg: "#fff", track: "#457b9d44" },
  Sequencer: { bg: "#2a9d8f", fg: "#fff", track: "#2a9d8f44" },
  Fireball:  { bg: "#e9c46a", fg: "#1a1a2e", track: "#e9c46a44" },
  Fountains: { bg: "#a855f7", fg: "#fff", track: "#a855f744" },
};

// ─── Utility: format seconds ──────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m === 0) return `${sec}s`;
  if (sec === 0) return `${m}m`;
  return `${m}m ${sec}s`;
}

// ─── Firework Form Modal ──────────────────────────────────────────────────────
function FireworkModal({ firework, onSave, onClose }) {
  const [form, setForm] = useState(
    firework || {
      name: "", type: "Cake", supplier: "", duration: 0,
      number_of_shots: 1, fuse_duration: 0, air_travel_time: 2,
      cost: 0, notes: "",
    }
  );

  const handleTypeChange = (newType) => {
    const defaults = FIREWORK_DEFAULTS[newType] || {};
    setForm((f) => ({ ...f, type: newType, ...defaults }));
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>
          {firework ? "Edit Firework" : "Add Firework"}
        </h3>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Name
            <input style={styles.input} value={form.name}
              onChange={(e) => set("name", e.target.value)} placeholder="Firework name" />
          </label>
          <label style={styles.label}>
            Type
            <select style={styles.input} value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}>
              {FIREWORK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={styles.label}>
            Supplier
            <input style={styles.input} value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)} placeholder="Supplier name" />
          </label>
          <label style={styles.label}>
            Cost ($)
            <input style={styles.input} type="number" min="0" step="0.01"
              value={form.cost} onChange={(e) => set("cost", +e.target.value)} />
          </label>
          <label style={styles.label}>
            Effect Duration (s)
            <input style={styles.input} type="number" min="0"
              value={form.duration} onChange={(e) => set("duration", +e.target.value)} />
          </label>
          <label style={styles.label}>
            Number of Shots
            <input style={styles.input} type="number" min="1"
              value={form.number_of_shots} onChange={(e) => set("number_of_shots", +e.target.value)} />
          </label>
          <label style={styles.label}>
            Fuse Duration (s)
            <input style={styles.input} type="number" min="0"
              value={form.fuse_duration} onChange={(e) => set("fuse_duration", +e.target.value)} />
          </label>
          <label style={styles.label}>
            Air Travel Time (s)
            <input style={styles.input} type="number" min="0"
              value={form.air_travel_time} onChange={(e) => set("air_travel_time", +e.target.value)} />
          </label>
          <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
            Notes
            <textarea style={{ ...styles.input, minHeight: 56, resize: "vertical" }}
              value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </div>
        <div style={styles.modalActions}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary}
            onClick={() => { if (form.name.trim()) onSave(form); }}
            disabled={!form.name.trim()}>
            {firework ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fireworks Bank View ──────────────────────────────────────────────────────
function FireworksBank({ fireworks, onAdd, onUpdate, onDelete, isAdmin }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filtered = fireworks.filter((fw) => {
    const matchSearch = fw.name.toLowerCase().includes(search.toLowerCase()) ||
      (fw.supplier || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "All" || fw.type === filterType;
    return matchSearch && matchType;
  });

  const handleSave = async (formData) => {
    // Strip out fields we don't want to write (id, userId, timestamps)
    const { id, userId, createdAt, updatedAt, ...cleanData } = formData;
    if (typeof modal === "object" && modal.id) {
      await onUpdate(modal.id, cleanData);
    } else {
      await onAdd(cleanData);
    }
    setModal(null);
  };

  return (
    <div>
      <div style={styles.bankHeader}>
        <div style={styles.bankControls}>
          <input style={styles.searchInput} placeholder="Search fireworks..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={styles.filterSelect} value={filterType}
            onChange={(e) => setFilterType(e.target.value)}>
            <option>All</option>
            {FIREWORK_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button style={styles.btnPrimary} onClick={() => setModal("add")}>
          + Add Firework
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Name","Type","Supplier","Duration","Shots","Fuse","ATT","Cost",
                ...(isAdmin ? ["Owner"] : []), "Actions"
              ].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((fw) => (
              <tr key={fw.id} style={styles.tr}>
                <td style={styles.td}>
                  <span style={styles.fwName}>{fw.name}</span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.typeBadge,
                    background: TYPE_COLORS[fw.type]?.bg || "#666",
                    color: TYPE_COLORS[fw.type]?.fg || "#fff",
                  }}>{fw.type}</span>
                </td>
                <td style={styles.td}>{fw.supplier || "—"}</td>
                <td style={styles.td}>{fw.duration}s</td>
                <td style={styles.td}>{fw.number_of_shots}</td>
                <td style={styles.td}>{fw.fuse_duration}s</td>
                <td style={styles.td}>{fw.air_travel_time}s</td>
                <td style={styles.td}>${(fw.cost || 0).toFixed(2)}</td>
                {isAdmin && (
                  <td style={styles.td}>
                    <span style={{ color: '#6b7fa3', fontSize: 11 }}>{fw.ownerName || '—'}</span>
                  </td>
                )}
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={styles.btnSmall} onClick={() => setModal(fw)}>Edit</button>
                    <button style={{ ...styles.btnSmall, ...styles.btnDanger }}
                      onClick={() => onDelete(fw.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 10 : 9} style={{ ...styles.td, textAlign: "center", color: "#8892a4" }}>
                No fireworks found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <FireworkModal
          firework={typeof modal === "object" ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Show Form Modal ──────────────────────────────────────────────────────────
function ShowModal({ show, onSave, onClose }) {
  const [name, setName] = useState(show?.name || "");
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>{show ? "Rename Show" : "New Show"}</h3>
        <label style={styles.label}>
          Show Name
          <input style={styles.input} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="e.g. July 4th 2026" autoFocus />
        </label>
        <div style={styles.modalActions}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnPrimary}
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            disabled={!name.trim()}>
            {show ? "Rename" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Firework to Show Picker ──────────────────────────────────────────────
function AddToShowPicker({ fireworks, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const filtered = fireworks.filter((fw) => {
    const m1 = fw.name.toLowerCase().includes(search.toLowerCase());
    const m2 = filterType === "All" || fw.type === filterType;
    return m1 && m2;
  });

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Add Firework to Show</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input style={{ ...styles.searchInput, flex: 1 }} placeholder="Search..."
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <select style={styles.filterSelect} value={filterType}
            onChange={(e) => setFilterType(e.target.value)}>
            <option>All</option>
            {FIREWORK_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.map((fw) => (
            <div key={fw.id} style={styles.pickerRow} onClick={() => onAdd(fw.id)}>
              <span style={{
                ...styles.typeBadge,
                background: TYPE_COLORS[fw.type]?.bg || "#666",
                color: TYPE_COLORS[fw.type]?.fg || "#fff",
                fontSize: 11,
              }}>{fw.type}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{fw.name}</span>
              <span style={{ color: "#8892a4", fontSize: 13 }}>
                {fw.duration > 0 ? `${fw.duration}s` : "instant"} · ${fw.cost || 0}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#8892a4", padding: 24 }}>
              No fireworks available
            </div>
          )}
        </div>
        <div style={{ ...styles.modalActions, marginTop: 12 }}>
          <button style={styles.btnSecondary} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Component ───────────────────────────────────────────────────────
function Timeline({ items, fireworks, onUpdateItem, showSelectedId, setShowSelectedId }) {
  const containerRef = useRef(null);

  const ROW_HEIGHT = 38;
  const LABEL_WIDTH = 180;
  const TOP_MARGIN = 40;
  const BOTTOM_MARGIN = 20;
  const RIGHT_MARGIN = 40;

  const enriched = items.map((si) => {
    const fw = fireworks.find((f) => f.id === si.fireworkId);
    return { ...si, fw };
  }).filter((x) => x.fw);

  const maxTime = useMemo(() => {
    let max = 60;
    enriched.forEach((e) => {
      const end = e.startTime + (e.fw.duration || 0);
      if (end > max) max = end;
    });
    return Math.ceil((max + 30) / 30) * 30;
  }, [enriched]);

  const svgHeight = TOP_MARGIN + Math.max(enriched.length, 1) * ROW_HEIGHT + BOTTOM_MARGIN;
  const timelineWidth = 800;
  const totalWidth = LABEL_WIDTH + timelineWidth + RIGHT_MARGIN;
  const pxPerSec = timelineWidth / maxTime;

  const ticks = [];
  const tickInterval = maxTime <= 120 ? 10 : maxTime <= 300 ? 15 : 30;
  for (let t = 0; t <= maxTime; t += tickInterval) ticks.push(t);

  const handleMouseDown = useCallback((e, itemId) => {
    e.preventDefault();
    const item = enriched.find((x) => x.id === itemId);
    if (!item) return;
    const startX = e.clientX || e.touches?.[0]?.clientX || 0;
    const startTime = item.startTime;

    const handleMove = (ev) => {
      const clientX = ev.clientX || ev.touches?.[0]?.clientX || 0;
      const dx = clientX - startX;
      const dt = dx / pxPerSec;
      const newTime = Math.max(0, Math.round(startTime + dt));
      onUpdateItem(itemId, { startTime: newTime });
    };

    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
  }, [enriched, pxPerSec, onUpdateItem]);

  return (
    <div ref={containerRef} style={styles.timelineContainer}>
      <svg width={totalWidth} height={svgHeight}
        style={{ minWidth: totalWidth, display: "block" }}>
        <rect x={0} y={0} width={totalWidth} height={svgHeight} fill="#0f1729" rx={8} />
        {enriched.map((_, i) => (
          <rect key={`row-${i}`}
            x={LABEL_WIDTH} y={TOP_MARGIN + i * ROW_HEIGHT}
            width={timelineWidth + RIGHT_MARGIN} height={ROW_HEIGHT}
            fill={i % 2 === 0 ? "#151d33" : "#1a2340"} />
        ))}
        {ticks.map((t) => (
          <g key={`tick-${t}`}>
            <line x1={LABEL_WIDTH + t * pxPerSec} y1={TOP_MARGIN - 4}
              x2={LABEL_WIDTH + t * pxPerSec} y2={svgHeight}
              stroke="#2a3555" strokeWidth={1} />
            <text x={LABEL_WIDTH + t * pxPerSec} y={TOP_MARGIN - 10}
              fill="#6b7fa3" fontSize={11} textAnchor="middle"
              fontFamily="'JetBrains Mono', 'SF Mono', monospace">
              {fmtTime(t)}
            </text>
          </g>
        ))}
        <line x1={LABEL_WIDTH} y1={TOP_MARGIN} x2={LABEL_WIDTH} y2={svgHeight}
          stroke="#2a3555" strokeWidth={1} />

        {enriched.map((item, i) => {
          const y = TOP_MARGIN + i * ROW_HEIGHT;
          const cy = y + ROW_HEIGHT / 2;
          const x = LABEL_WIDTH + item.startTime * pxPerSec;
          const color = TYPE_COLORS[item.fw.type] || { bg: "#666", fg: "#fff" };
          const isSelected = showSelectedId === item.id;
          const dur = item.fw.duration || 0;

          return (
            <g key={item.id} style={{ cursor: "grab" }}
              onMouseDown={(e) => handleMouseDown(e, item.id)}
              onTouchStart={(e) => handleMouseDown(e, item.id)}
              onClick={() => setShowSelectedId(isSelected ? null : item.id)}>
              <text x={LABEL_WIDTH - 10} y={cy + 1}
                fill={isSelected ? "#fff" : "#c8d4e6"} fontSize={12.5}
                textAnchor="end" dominantBaseline="middle"
                fontFamily="'JetBrains Mono', 'SF Mono', monospace"
                fontWeight={isSelected ? 600 : 400}>
                {item.fw.name}
              </text>
              {isSelected && (
                <rect x={LABEL_WIDTH} y={y} width={timelineWidth + RIGHT_MARGIN}
                  height={ROW_HEIGHT} fill="#ffffff08" />
              )}
              {dur > 0 ? (
                <>
                  <rect x={x} y={cy - 10} width={Math.max(dur * pxPerSec, 4)}
                    height={20} rx={4} fill={color.bg} opacity={0.85} />
                  <rect x={x} y={cy - 10} width={Math.max(dur * pxPerSec, 4)}
                    height={20} rx={4} fill="none"
                    stroke={isSelected ? "#fff" : color.bg} strokeWidth={isSelected ? 2 : 0} />
                  {dur * pxPerSec > 40 && (
                    <text x={x + dur * pxPerSec / 2} y={cy + 1}
                      fill={color.fg} fontSize={10} textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="'JetBrains Mono', 'SF Mono', monospace">
                      {fmtTime(dur)}
                    </text>
                  )}
                </>
              ) : (
                <polygon
                  points={`${x},${cy - 10} ${x + 10},${cy} ${x},${cy + 10} ${x - 10},${cy}`}
                  fill={color.bg} stroke={isSelected ? "#fff" : "none"} strokeWidth={2} />
              )}
            </g>
          );
        })}

        {enriched.length === 0 && (
          <text x={totalWidth / 2} y={svgHeight / 2}
            fill="#6b7fa3" fontSize={14} textAnchor="middle"
            fontFamily="'JetBrains Mono', 'SF Mono', monospace">
            No fireworks in this show yet.
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Show Editor View ─────────────────────────────────────────────────────────
function ShowEditor({ show, fireworks, onUpdateFirework }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [editingFirework, setEditingFirework] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Subscribe to show items from Firestore
  useEffect(() => {
    if (!show) return;
    setLoadingItems(true);
    const unsub = subscribeShowItems(show.id, (loadedItems) => {
      setItems(loadedItems);
      setLoadingItems(false);
    });
    return unsub;
  }, [show?.id]);

  // Clear selection when switching shows
  useEffect(() => { setSelectedItemId(null); }, [show?.id]);

  const handleAddFirework = async (fireworkId) => {
    const maxTime = items.reduce((max, si) => {
      const fw = fireworks.find((f) => f.id === si.fireworkId);
      const end = si.startTime + (fw?.duration || 0);
      return end > max ? end : max;
    }, 0);
    await addShowItem(show.id, {
      fireworkId,
      startTime: Math.round(maxTime + 5),
      quantity: 1,
    });
  };

  // Local optimistic update for drag (writes to Firestore on mouseup via debounce)
  const dragTimeoutRef = useRef({});
  const handleUpdateItemLocal = useCallback((itemId, updates) => {
    // Update local state immediately for smooth dragging
    setItems((prev) => prev.map((si) => si.id === itemId ? { ...si, ...updates } : si));
    // Debounce the Firestore write
    if (dragTimeoutRef.current[itemId]) clearTimeout(dragTimeoutRef.current[itemId]);
    dragTimeoutRef.current[itemId] = setTimeout(() => {
      updateShowItem(show.id, itemId, updates);
    }, 300);
  }, [show?.id]);

  const handleDeleteItem = async (itemId) => {
    await deleteShowItem(show.id, itemId);
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  const handleEditFirework = async (formData) => {
    const { id, userId, createdAt, updatedAt, ownerName, ...cleanData } = formData;
    await onUpdateFirework(editingFirework.id, cleanData);
    setEditingFirework(null);
  };

  if (!show) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🎆</div>
        <p style={{ color: "#8892a4", fontSize: 16 }}>Select a show to edit its timeline</p>
      </div>
    );
  }

  if (loadingItems) {
    return (
      <div style={styles.emptyState}>
        <p style={{ color: "#8892a4" }}>Loading show...</p>
      </div>
    );
  }

  // Enrich items with firework data
  const enrichedItems = items.map((si) => ({
    ...si,
    fw: fireworks.find((f) => f.id === si.fireworkId),
  })).filter((x) => x.fw);

  const totalCost = enrichedItems.reduce((sum, x) => sum + (x.fw.cost || 0) * (x.quantity || 1), 0);
  const totalDuration = enrichedItems.reduce((max, x) => {
    const end = x.startTime + (x.fw.duration || 0);
    return end > max ? end : max;
  }, 0);

  // Detect out-of-order for "Update Timeline" button
  const isOutOfOrder = enrichedItems.length > 1 && enrichedItems.some((item, i) =>
    i > 0 && item.startTime < enrichedItems[i - 1].startTime
  );

  const handleReorderTimeline = () => {
    const sorted = [...items].sort((a, b) => a.startTime - b.startTime);
    setItems(sorted);
    // Write new sortOrder to Firestore
    sorted.forEach((item, index) => {
      updateShowItem(show.id, item.id, { sortOrder: index });
    });
  };

  const selectedItem = selectedItemId
    ? enrichedItems.find((x) => x.id === selectedItemId) : null;

  return (
    <div style={styles.editorLayout}>
      <div style={styles.editorMain}>
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Fireworks</span>
            <span style={styles.statValue}>{enrichedItems.length}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Duration</span>
            <span style={styles.statValue}>{fmtTime(totalDuration)}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Total Cost</span>
            <span style={styles.statValue}>${totalCost.toFixed(2)}</span>
          </div>
          <div style={{ flex: 1 }} />
          {isOutOfOrder && (
            <button style={{
              ...styles.btnPrimary,
              background: "linear-gradient(135deg, #2a9d8f, #457b9d)",
              animation: "fadeIn 0.2s ease-out",
            }} onClick={handleReorderTimeline}>
              ↕ Update Timeline
            </button>
          )}
          <button style={styles.btnPrimary} onClick={() => setShowPicker(true)}>
            + Add Firework
          </button>
        </div>

        <Timeline
          items={items}
          fireworks={fireworks}
          onUpdateItem={handleUpdateItemLocal}
          showSelectedId={selectedItemId}
          setShowSelectedId={setSelectedItemId}
        />

        {selectedItem && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <span style={{
                ...styles.typeBadge,
                background: TYPE_COLORS[selectedItem.fw.type]?.bg,
                color: TYPE_COLORS[selectedItem.fw.type]?.fg,
              }}>{selectedItem.fw.type}</span>
              <h4 style={{ margin: 0, color: "#e4e9f2", fontSize: 15 }}>{selectedItem.fw.name}</h4>
              <div style={{ flex: 1 }} />
              <button style={{ ...styles.btnSmall, background: "#1a3a2a", borderColor: "#2a9d8f44", color: "#2a9d8f" }}
                onClick={() => setEditingFirework(selectedItem.fw)}>
                Edit Firework
              </button>
              <button style={{ ...styles.btnSmall, ...styles.btnDanger }}
                onClick={() => handleDeleteItem(selectedItem.id)}>
                Remove from Show
              </button>
              <button style={styles.btnSmall}
                onClick={() => setSelectedItemId(null)}>✕</button>
            </div>
            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Start Time</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input style={{ ...styles.input, width: 80, padding: "4px 8px" }}
                    type="number" min={0} value={selectedItem.startTime}
                    onChange={(e) => handleUpdateItemLocal(selectedItem.id, { startTime: Math.max(0, +e.target.value) })} />
                  <span style={{ color: "#8892a4", fontSize: 12 }}>sec</span>
                </div>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Effect Duration</span>
                <span style={styles.detailValue}>{selectedItem.fw.duration}s</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Fuse Duration</span>
                <span style={styles.detailValue}>{selectedItem.fw.fuse_duration}s</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Air Travel Time</span>
                <span style={styles.detailValue}>{selectedItem.fw.air_travel_time}s</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Ignition Time</span>
                <span style={styles.detailValue}>
                  {fmtTime(Math.max(0, selectedItem.startTime - selectedItem.fw.fuse_duration))}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Launch Time</span>
                <span style={styles.detailValue}>
                  {fmtTime(Math.max(0, selectedItem.startTime - selectedItem.fw.air_travel_time))}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Cost</span>
                <span style={styles.detailValue}>${(selectedItem.fw.cost || 0).toFixed(2)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Shots</span>
                <span style={styles.detailValue}>{selectedItem.fw.number_of_shots}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <AddToShowPicker fireworks={fireworks} onAdd={handleAddFirework}
          onClose={() => setShowPicker(false)} />
      )}
      {editingFirework && (
        <FireworkModal firework={editingFirework} onSave={handleEditFirework}
          onClose={() => setEditingFirework(null)} />
      )}
    </div>
  );
}

// ─── Shows Library View ───────────────────────────────────────────────────────
function ShowsLibrary({ shows, fireworks, onAdd, onUpdate, onDelete, onOpen, isAdmin }) {
  const [modal, setModal] = useState(null);

  const handleSave = async (name) => {
    if (typeof modal === "object" && modal.id) {
      await onUpdate(modal.id, { name });
    } else {
      await onAdd(name);
    }
    setModal(null);
  };

  return (
    <div>
      <div style={styles.bankHeader}>
        <h2 style={{ margin: 0, color: "#e4e9f2", fontSize: 20 }}>Show Library</h2>
        <button style={styles.btnPrimary} onClick={() => setModal("add")}>+ New Show</button>
      </div>

      {shows.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎇</div>
          <p style={{ color: "#8892a4" }}>No shows yet. Create one to get started!</p>
        </div>
      ) : (
        <div style={styles.showGrid}>
          {shows.map((show) => (
            <div key={show.id} style={styles.showCard} onClick={() => onOpen(show.id)}>
              <div style={styles.showCardHeader}>
                <h3 style={{ margin: 0, color: "#e4e9f2", fontSize: 16 }}>{show.name}</h3>
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button style={styles.btnSmall} onClick={() => setModal(show)}>Rename</button>
                  <button style={{ ...styles.btnSmall, ...styles.btnDanger }}
                    onClick={() => onDelete(show.id)}>Delete</button>
                </div>
              </div>
              {isAdmin && show.ownerName && (
                <div style={{ color: '#6b7fa3', fontSize: 11, marginBottom: 4 }}>
                  Owner: {show.ownerName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ShowModal show={typeof modal === "object" ? modal : null}
          onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const [view, setView] = useState("editor");
  const [fireworks, setFireworks] = useState([]);
  const [shows, setShows] = useState([]);
  const [activeShowId, setActiveShowId] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Subscribe to fireworks
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeFireworks(currentUser.uid, isAdmin(), (data) => {
      setFireworks(data);
      setLoadingData(false);
    });
    return unsub;
  }, [currentUser, userProfile]);

  // Subscribe to shows
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeShows(currentUser.uid, isAdmin(), (data) => {
      setShows(data);
      if (!activeShowId && data.length > 0) {
        setActiveShowId(data[0].id);
      }
    });
    return unsub;
  }, [currentUser, userProfile]);

  // Firework CRUD handlers
  const handleAddFirework = (data) => addFirework(currentUser.uid, data);
  const handleUpdateFirework = (id, data) => updateFirework(id, data);
  const handleDeleteFirework = (id) => deleteFirework(id);

  // Show CRUD handlers
  const handleAddShow = async (name) => {
    const docRef = await addShow(currentUser.uid, name);
    setActiveShowId(docRef.id);
    setView("editor");
  };
  const handleUpdateShow = (id, data) => updateShow(id, data);
  const handleDeleteShow = async (id) => {
    await deleteShow(id);
    if (activeShowId === id) {
      setActiveShowId(shows.find((s) => s.id !== id)?.id || null);
    }
  };
  const handleOpenShow = (id) => {
    setActiveShowId(id);
    setView("editor");
  };

  const activeShow = shows.find((s) => s.id === activeShowId) || null;

  const navItems = [
    { id: "shows", label: "Shows", icon: "🎇" },
    { id: "editor", label: "Timeline", icon: "🎆" },
    { id: "bank", label: "Fireworks Bank", icon: "🧨" },
  ];

  if (loadingData) {
    return (
      <div style={{ ...styles.root, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#6b7fa3', fontSize: 16 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <span style={styles.logo}>🎆</span>
          <span style={styles.appTitle}>PyroPlanner</span>
        </div>
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <button key={item.id}
              style={{ ...styles.navBtn, ...(view === item.id ? styles.navBtnActive : {}) }}
              onClick={() => setView(item.id)}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {view === "editor" && shows.length > 0 && (
          <select style={styles.showSelect} value={activeShowId || ""}
            onChange={(e) => setActiveShowId(e.target.value)}>
            <option value="" disabled>Select show...</option>
            {shows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <div style={styles.userArea}>
          <span style={{ color: '#6b7fa3', fontSize: 12 }}>
            {currentUser.displayName || currentUser.email}
            {isAdmin() && <span style={{ color: '#e63946', marginLeft: 6 }}>ADMIN</span>}
          </span>
          <button style={styles.btnSmall} onClick={logout}>Sign Out</button>
        </div>
      </header>

      <main style={styles.main}>
        {view === "bank" && (
          <FireworksBank fireworks={fireworks}
            onAdd={handleAddFirework} onUpdate={handleUpdateFirework}
            onDelete={handleDeleteFirework} isAdmin={isAdmin()} />
        )}
        {view === "shows" && (
          <ShowsLibrary shows={shows} fireworks={fireworks}
            onAdd={handleAddShow} onUpdate={handleUpdateShow}
            onDelete={handleDeleteShow} onOpen={handleOpenShow}
            isAdmin={isAdmin()} />
        )}
        {view === "editor" && (
          <ShowEditor show={activeShow} fireworks={fireworks}
            onUpdateFirework={handleUpdateFirework} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center',
        alignItems: 'center', background: '#0a0e1a', fontFamily: "'JetBrains Mono', monospace" }}>
        <p style={{ color: '#6b7fa3' }}>Loading...</p>
      </div>
    );
  }

  if (!currentUser) return <Login />;
  return <AppContent />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    background: "linear-gradient(135deg, #0a0e1a 0%, #0f1729 50%, #131b30 100%)",
    color: "#c8d4e6",
    minHeight: "100vh",
    fontSize: 13,
  },
  header: {
    display: "flex", alignItems: "center", gap: 16, padding: "10px 20px",
    background: "#0d1220", borderBottom: "1px solid #1e2a45", flexWrap: "wrap",
  },
  logoArea: { display: "flex", alignItems: "center", gap: 8 },
  logo: { fontSize: 24 },
  appTitle: {
    fontSize: 18, fontWeight: 700,
    background: "linear-gradient(90deg, #ff6b35, #e63946, #a855f7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1,
  },
  nav: { display: "flex", gap: 4, marginLeft: 12 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
    background: "transparent", border: "1px solid transparent", borderRadius: 6,
    color: "#8892a4", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  navBtnActive: { background: "#1a2340", borderColor: "#2a3555", color: "#e4e9f2" },
  showSelect: {
    padding: "6px 12px", background: "#1a2340", border: "1px solid #2a3555",
    borderRadius: 6, color: "#e4e9f2", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
  },
  userArea: {
    marginLeft: "auto", display: "flex", alignItems: "center", gap: 10,
  },
  main: { padding: 20, maxWidth: 1200, margin: "0 auto" },
  bankHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, flexWrap: "wrap", gap: 12,
  },
  bankControls: { display: "flex", gap: 8, flexWrap: "wrap" },
  searchInput: {
    padding: "8px 12px", background: "#1a2340", border: "1px solid #2a3555",
    borderRadius: 6, color: "#e4e9f2", fontSize: 13, fontFamily: "inherit", outline: "none", width: 220,
  },
  filterSelect: {
    padding: "8px 12px", background: "#1a2340", border: "1px solid #2a3555",
    borderRadius: 6, color: "#e4e9f2", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
  },
  tableWrap: { overflowX: "auto", borderRadius: 8, border: "1px solid #1e2a45" },
  table: { width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" },
  th: {
    padding: "10px 14px", textAlign: "left", background: "#0d1220",
    color: "#6b7fa3", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8,
    borderBottom: "1px solid #1e2a45",
  },
  tr: { borderBottom: "1px solid #151d33" },
  td: { padding: "10px 14px", fontSize: 13 },
  fwName: { fontWeight: 600, color: "#e4e9f2" },
  typeBadge: {
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
  },
  btnPrimary: {
    padding: "8px 16px", background: "linear-gradient(135deg, #e63946, #ff6b35)",
    border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3,
  },
  btnSecondary: {
    padding: "8px 16px", background: "#1a2340", border: "1px solid #2a3555",
    borderRadius: 6, color: "#c8d4e6", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  btnSmall: {
    padding: "4px 10px", background: "#1a2340", border: "1px solid #2a3555",
    borderRadius: 4, color: "#c8d4e6", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  btnDanger: { borderColor: "#e6394644", color: "#e63946" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#131b30", border: "1px solid #2a3555", borderRadius: 12,
    padding: 24, width: "90%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
  },
  modalTitle: { margin: "0 0 16px 0", color: "#e4e9f2", fontSize: 18, fontWeight: 700 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: {
    display: "flex", flexDirection: "column", gap: 4, color: "#6b7fa3",
    fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5,
  },
  input: {
    padding: "8px 10px", background: "#0d1220", border: "1px solid #2a3555",
    borderRadius: 6, color: "#e4e9f2", fontSize: 13, fontFamily: "inherit", outline: "none",
  },
  pickerRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    borderRadius: 6, cursor: "pointer", borderBottom: "1px solid #1e2a45",
  },
  showGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  showCard: {
    background: "#131b30", border: "1px solid #1e2a45", borderRadius: 10,
    padding: 16, cursor: "pointer",
  },
  showCardHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  editorLayout: { display: "flex", flexDirection: "column" },
  editorMain: { flex: 1, minWidth: 0 },
  statsBar: {
    display: "flex", alignItems: "center", gap: 24, padding: "12px 16px",
    background: "#0d1220", borderRadius: 8, marginBottom: 16, border: "1px solid #1e2a45",
    flexWrap: "wrap",
  },
  stat: { display: "flex", flexDirection: "column", gap: 2 },
  statLabel: { fontSize: 10, color: "#6b7fa3", textTransform: "uppercase", letterSpacing: 0.8 },
  statValue: { fontSize: 18, fontWeight: 700, color: "#e4e9f2" },
  timelineContainer: { overflowX: "auto", borderRadius: 8, border: "1px solid #1e2a45", marginBottom: 16 },
  detailPanel: {
    background: "#0d1220", borderRadius: 8, border: "1px solid #1e2a45", padding: 16,
  },
  detailHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
  detailItem: { display: "flex", flexDirection: "column", gap: 2 },
  detailLabel: { fontSize: 10, color: "#6b7fa3", textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: "#e4e9f2", fontWeight: 500 },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
};
