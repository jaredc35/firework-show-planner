import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import uuid
import json

# Initialize session state
if "fireworks" not in st.session_state:
    st.session_state.fireworks = []
if "selected_firework_id" not in st.session_state:
    st.session_state.selected_firework_id = None
if "edit_mode" not in st.session_state:
    st.session_state.edit_mode = "Add New"


def calculate_end_time(start_time, fuse_duration, explosion_duration):
    """Calculate end time based on start time and durations"""
    return start_time + fuse_duration + explosion_duration


def get_dependent_start_time(dependent_on_id, offset=0):
    """Calculate start time based on dependency"""
    if not dependent_on_id:
        return 0

    dependent_firework = next(
        (fw for fw in st.session_state.fireworks if fw["id"] == dependent_on_id), None
    )
    if dependent_firework:
        return dependent_firework["end_time"] + offset
    return 0


def has_dependents(firework_id):
    """Check if a firework has any dependents"""
    return any(fw["dependent_on"] == firework_id for fw in st.session_state.fireworks)


def get_earliest_dependent_time(firework_id):
    """Get the earliest start time of dependents for validation"""
    dependents = [
        fw for fw in st.session_state.fireworks if fw["dependent_on"] == firework_id
    ]
    if not dependents:
        return float("inf")
    return min(fw["start_time"] for fw in dependents)
    """Calculate start time based on dependency"""
    if not dependent_on_id:
        return 0

    dependent_firework = next(
        (fw for fw in st.session_state.fireworks if fw["id"] == dependent_on_id), None
    )
    if dependent_firework:
        return dependent_firework["end_time"] + offset
    return 0


def add_firework(
    name,
    start_time,
    fuse_duration,
    explosion_duration,
    dependent_on=None,
    dependency_offset=0,
    cost=0,
):
    """Add a new firework to the list"""
    firework_id = str(uuid.uuid4())[:8]

    # Calculate actual start time if dependent
    if dependent_on:
        actual_start_time = get_dependent_start_time(dependent_on, dependency_offset)
    else:
        actual_start_time = start_time

    end_time = calculate_end_time(actual_start_time, fuse_duration, explosion_duration)

    firework = {
        "id": firework_id,
        "name": name,
        "start_time": actual_start_time,
        "fuse_duration": fuse_duration,
        "explosion_duration": explosion_duration,
        "end_time": end_time,
        "dependent_on": dependent_on,
        "dependency_offset": dependency_offset,
        "cost": cost,
    }

    st.session_state.fireworks.append(firework)
    update_dependent_fireworks()


def update_dependent_fireworks():
    """Update start/end times for fireworks with dependencies recursively"""
    # Keep updating until no more changes are needed (handles chain dependencies)
    changed = True
    max_iterations = 10  # Prevent infinite loops
    iteration = 0

    while changed and iteration < max_iterations:
        changed = False
        iteration += 1

        for firework in st.session_state.fireworks:
            if firework["dependent_on"]:
                new_start = get_dependent_start_time(
                    firework["dependent_on"], firework["dependency_offset"]
                )
                new_end = calculate_end_time(
                    new_start, firework["fuse_duration"], firework["explosion_duration"]
                )

                if (
                    new_start != firework["start_time"]
                    or new_end != firework["end_time"]
                ):
                    firework["start_time"] = new_start
                    firework["end_time"] = new_end
                    changed = True


def remove_firework(firework_id):
    """Remove a firework and update dependencies"""
    st.session_state.fireworks = [
        fw for fw in st.session_state.fireworks if fw["id"] != firework_id
    ]

    # Remove dependencies on deleted firework
    for firework in st.session_state.fireworks:
        if firework["dependent_on"] == firework_id:
            firework["dependent_on"] = None
            firework["dependency_offset"] = 0

    update_dependent_fireworks()


def create_gantt_chart():
    """Create interactive Gantt chart with clickable bars"""
    if not st.session_state.fireworks:
        return go.Figure()

    # Sort by explosion time (start_time + fuse_duration)
    sorted_fireworks = sorted(
        st.session_state.fireworks, key=lambda x: x["start_time"] + x["fuse_duration"]
    )

    fig = go.Figure()

    # Color scheme
    fuse_color = "#FF6B6B"  # Red for fuse
    explosion_color = "#4ECDC4"  # Teal for explosion

    for i, fw in enumerate(sorted_fireworks):
        y_pos = len(sorted_fireworks) - i - 1  # Reverse order for top-to-bottom

        # Fuse duration bar
        fig.add_trace(
            go.Bar(
                name="Fuse Time",
                x=[fw["fuse_duration"]],
                y=[y_pos],
                base=[fw["start_time"]],
                orientation="h",
                marker_color=fuse_color,
                customdata=[fw["id"]],
                hovertemplate=f"<b>{fw['name']}</b><br>"
                + f"Fuse: {fw['start_time']:.1f}s - {fw['start_time'] + fw['fuse_duration']:.1f}s<br>"
                + f"Duration: {fw['fuse_duration']:.1f}s<br>"
                + f"Cost: ${fw.get('cost', 0):.2f}<extra></extra>",
                showlegend=(i == 0),
                legendgroup="fuse",
            )
        )

        # Explosion duration bar
        explosion_start = fw["start_time"] + fw["fuse_duration"]
        fig.add_trace(
            go.Bar(
                name="Explosion Time",
                x=[fw["explosion_duration"]],
                y=[y_pos],
                base=[explosion_start],
                orientation="h",
                marker_color=explosion_color,
                customdata=[fw["id"]],
                hovertemplate=f"<b>{fw['name']}</b><br>"
                + f"Explosion: {explosion_start:.1f}s - {fw['end_time']:.1f}s<br>"
                + f"Duration: {fw['explosion_duration']:.1f}s<br>"
                + f"Cost: ${fw.get('cost', 0):.2f}<extra></extra>",
                showlegend=(i == 0),
                legendgroup="explosion",
            )
        )

    # Add dependency lines
    for fw in st.session_state.fireworks:
        if fw["dependent_on"]:
            parent_fw = next(
                (
                    f
                    for f in st.session_state.fireworks
                    if f["id"] == fw["dependent_on"]
                ),
                None,
            )
            if parent_fw:
                parent_y = next(
                    (
                        len(sorted_fireworks) - i - 1
                        for i, f in enumerate(sorted_fireworks)
                        if f["id"] == parent_fw["id"]
                    ),
                    0,
                )
                child_y = next(
                    (
                        len(sorted_fireworks) - i - 1
                        for i, f in enumerate(sorted_fireworks)
                        if f["id"] == fw["id"]
                    ),
                    0,
                )

                fig.add_trace(
                    go.Scatter(
                        x=[parent_fw["end_time"], fw["start_time"]],
                        y=[parent_y, child_y],
                        mode="lines+markers",
                        line=dict(color="gray", width=2, dash="dash"),
                        marker=dict(symbol="arrow-right", size=8),
                        showlegend=False,
                        hovertemplate=f"Dependency: {parent_fw['name']} → {fw['name']}<extra></extra>",
                    )
                )

    fig.update_layout(
        title="Firework Show Timeline",
        xaxis_title="Time (seconds)",
        yaxis_title="Fireworks",
        yaxis=dict(
            tickmode="array",
            tickvals=list(range(len(sorted_fireworks))),
            ticktext=[fw["name"] for fw in reversed(sorted_fireworks)],
        ),
        barmode="stack",
        height=max(400, len(sorted_fireworks) * 40),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )

    return fig


def main():
    st.set_page_config(
        page_title="Firework Show Planner", page_icon="🎆", layout="wide"
    )

    st.title("🎆 Firework Show Planner")

    col1, col2 = st.columns([1, 2])

    with col1:
        st.header("Add/Edit Fireworks")

        # Mode selection
        mode = st.radio(
            "Mode",
            ["Add New", "Edit Existing"],
            index=0 if st.session_state.edit_mode == "Add New" else 1,
            horizontal=True,
            key="mode_selector",
        )
        st.session_state.edit_mode = mode

        if mode == "Edit Existing" and st.session_state.fireworks:
            # Select firework to edit - sorted by start time
            sorted_fireworks = sorted(
                st.session_state.fireworks, key=lambda x: x["start_time"]
            )
            edit_options = [fw["name"] for fw in sorted_fireworks]

            # Auto-select if chart selection exists
            default_index = 0
            if st.session_state.selected_firework_id:
                try:
                    selected_fw = next(
                        fw
                        for fw in st.session_state.fireworks
                        if fw["id"] == st.session_state.selected_firework_id
                    )
                    if selected_fw["name"] in edit_options:
                        default_index = edit_options.index(selected_fw["name"])
                except StopIteration:
                    pass

            selected_fw_name = st.selectbox(
                "Select firework to edit", edit_options, index=default_index
            )
            selected_fw = next(
                fw
                for fw in st.session_state.fireworks
                if fw["name"] == selected_fw_name
            )

            # Edit form - dynamic fields outside form
            name = st.text_input(
                "Firework Name", value=selected_fw["name"], key="edit_name"
            )

            # Dependency selection
            firework_options = [None] + [
                fw["name"]
                for fw in st.session_state.fireworks
                if fw["id"] != selected_fw["id"]
            ]
            current_dep_name = None
            current_dep_index = 0
            if selected_fw["dependent_on"]:
                dep_fw = next(
                    (
                        fw
                        for fw in st.session_state.fireworks
                        if fw["id"] == selected_fw["dependent_on"]
                    ),
                    None,
                )
                if dep_fw:
                    current_dep_name = dep_fw["name"]
                    if current_dep_name in firework_options:
                        current_dep_index = firework_options.index(current_dep_name)

            dependent_on_name = st.selectbox(
                "Dependent on (optional)",
                firework_options,
                index=current_dep_index,
                key=f"edit_dependency_{selected_fw['id']}",
            )  # Unique key per firework

            if dependent_on_name:
                dependent_on_id = next(
                    fw["id"]
                    for fw in st.session_state.fireworks
                    if fw["name"] == dependent_on_name
                )
                parent_fw = next(
                    fw
                    for fw in st.session_state.fireworks
                    if fw["name"] == dependent_on_name
                )

                dependency_offset = st.number_input(
                    "Offset from dependency (seconds)",
                    value=float(selected_fw["dependency_offset"]),
                    step=0.1,
                    help="Positive = start after dependency ends, Negative = start before dependency ends",
                    key="edit_offset",
                )

                calculated_start = parent_fw["end_time"] + dependency_offset
                st.info(
                    f"Start time will be: {calculated_start:.1f}s (dependency ends at {parent_fw['end_time']:.1f}s)"
                )
                start_time = 0.0  # Will be calculated
            else:
                dependency_offset = 0.0
                dependent_on_id = None
                start_time = st.number_input(
                    "Start Time (seconds)",
                    min_value=0.0,
                    value=float(selected_fw["start_time"]),
                    step=0.1,
                    key="edit_start",
                )

            # Check if firework has dependents and show warning/constraint
            if has_dependents(selected_fw["id"]):
                max_allowed_time = get_earliest_dependent_time(selected_fw["id"])
                st.warning(
                    f"⚠️ This firework has dependents. Maximum start time: {max_allowed_time:.1f}s"
                )
                if not dependent_on_name:  # Only constrain if not dependent
                    start_time = st.number_input(
                        "Start Time (seconds)",
                        min_value=0.0,
                        max_value=float(max_allowed_time),
                        value=min(float(selected_fw["start_time"]), max_allowed_time),
                        step=0.1,
                        key="edit_constrained_start_time",
                    )

            fuse_duration = st.number_input(
                "Fuse Duration (seconds)",
                min_value=0.1,
                value=float(selected_fw["fuse_duration"]),
                step=0.1,
                key="edit_fuse",
            )
            explosion_duration = st.number_input(
                "Explosion Duration (seconds)",
                min_value=0.1,
                value=float(selected_fw["explosion_duration"]),
                step=0.1,
                key="edit_explosion",
            )
            cost = st.number_input(
                "Cost (USD)",
                min_value=0.0,
                value=float(selected_fw.get("cost", 0)),
                step=0.01,
                key="edit_cost",
            )

            col_update, col_delete = st.columns(2)
            with col_update:
                if st.button("Update Firework", key="update_btn"):
                    # Remove old firework
                    st.session_state.fireworks = [
                        fw
                        for fw in st.session_state.fireworks
                        if fw["id"] != selected_fw["id"]
                    ]
                    # Add updated firework with same ID
                    add_firework(
                        name,
                        start_time,
                        fuse_duration,
                        explosion_duration,
                        dependent_on_id,
                        dependency_offset,
                        cost,
                    )
                    st.session_state.fireworks[-1]["id"] = selected_fw[
                        "id"
                    ]  # Keep same ID
                    update_dependent_fireworks()  # Ensure all dependencies are updated
                    st.session_state.selected_firework_id = None  # Clear selection
                    st.session_state.edit_mode = "Add New"  # Reset to Add mode
                    st.success(f"Updated {name}!")
                    st.rerun()

            with col_delete:
                if st.button("Delete Firework", key="delete_btn"):
                    remove_firework(selected_fw["id"])
                    st.session_state.selected_firework_id = None
                    st.success(f"Deleted {selected_fw['name']}!")
                    st.rerun()

        elif mode == "Add New":
            # Add new firework form
            name = st.text_input("Firework Name")

            # Dependency selection (outside form for dynamic updates)
            sorted_available_fireworks = sorted(
                st.session_state.fireworks, key=lambda x: x["start_time"]
            )
            firework_options = [None] + [
                fw["name"] for fw in sorted_available_fireworks
            ]
            dependent_on_name = st.selectbox(
                "Dependent on (optional)", firework_options
            )

            if dependent_on_name:
                dependent_on_id = next(
                    fw["id"]
                    for fw in st.session_state.fireworks
                    if fw["name"] == dependent_on_name
                )
                parent_fw = next(
                    fw
                    for fw in st.session_state.fireworks
                    if fw["name"] == dependent_on_name
                )

                dependency_offset = st.number_input(
                    "Offset from dependency (seconds)",
                    value=0.0,
                    step=0.1,
                    help="Positive = start after dependency ends, Negative = start before dependency ends",
                )

                calculated_start = parent_fw["end_time"] + dependency_offset
                st.info(
                    f"Start time will be: {calculated_start:.1f}s (dependency ends at {parent_fw['end_time']:.1f}s)"
                )
                start_time = 0.0  # Will be calculated in add_firework
            else:
                dependency_offset = 0.0
                dependent_on_id = None
                start_time = st.number_input(
                    "Start Time (seconds)", min_value=0.0, value=0.0, step=0.1
                )

            fuse_duration = st.number_input(
                "Fuse Duration (seconds)", min_value=0.1, value=2.0, step=0.1
            )
            explosion_duration = st.number_input(
                "Explosion Duration (seconds)", min_value=0.1, value=3.0, step=0.1
            )
            cost = st.number_input("Cost (USD)", min_value=0.0, value=0.0, step=0.01)

            if st.button("Add Firework") and name:
                add_firework(
                    name,
                    start_time,
                    fuse_duration,
                    explosion_duration,
                    dependent_on_id,
                    dependency_offset,
                    cost,
                )
                st.success(f"Added {name}!")
                st.rerun()

        else:
            st.info("No fireworks to edit. Add some fireworks first!")

        # Current fireworks list
        st.header("Current Fireworks")

        if st.session_state.fireworks:
            for fw in sorted(st.session_state.fireworks, key=lambda x: x["start_time"]):
                with st.expander(f"{fw['name']} ({fw['id']})"):
                    st.write(f"**Start:** {fw['start_time']:.1f}s")
                    st.write(f"**Fuse:** {fw['fuse_duration']:.1f}s")
                    st.write(f"**Explosion:** {fw['explosion_duration']:.1f}s")
                    st.write(f"**End:** {fw['end_time']:.1f}s")
                    if fw["dependent_on"]:
                        dep_name = next(
                            (
                                f["name"]
                                for f in st.session_state.fireworks
                                if f["id"] == fw["dependent_on"]
                            ),
                            "Unknown",
                        )
                        st.write(
                            f"**Depends on:** {dep_name} (+{fw['dependency_offset']:.1f}s)"
                        )

                    if st.button(f"Remove {fw['name']}", key=f"remove_{fw['id']}"):
                        remove_firework(fw["id"])
                        st.rerun()
        else:
            st.info("No fireworks added yet")

        # Show statistics
        if st.session_state.fireworks:
            st.header("Show Statistics")
            total_duration = max(fw["end_time"] for fw in st.session_state.fireworks)
            total_cost = sum(fw.get("cost", 0) for fw in st.session_state.fireworks)
            st.metric("Total Show Duration", f"{total_duration:.1f} seconds")
            st.metric("Number of Fireworks", len(st.session_state.fireworks))
            st.metric("Total Cost", f"${total_cost:.2f}")

    with col2:
        st.header("Timeline Gantt Chart")

        if st.session_state.fireworks:
            fig = create_gantt_chart()
            st.plotly_chart(fig, use_container_width=True, key="gantt_chart")
            st.info(
                "🎯 **Legend:**\n- 🔴 Red = Fuse duration\n- 🟢 Teal = Explosion duration\n- ➖ Gray dashed lines = Dependencies"
            )

            # Export/Import functionality
            st.header("Export/Import")

            col_export, col_import = st.columns(2)

            with col_export:
                if st.session_state.fireworks and st.button("Export Show Data"):
                    export_data = json.dumps(st.session_state.fireworks, indent=2)
                    st.download_button(
                        label="Download JSON",
                        data=export_data,
                        file_name="firework_show.json",
                        mime="application/json",
                    )

            with col_import:
                uploaded_file = st.file_uploader(
                    "Import Show Data", type=["json"], key="import_uploader"
                )
                if uploaded_file and uploaded_file not in st.session_state.get(
                    "processed_files", set()
                ):
                    try:
                        imported_data = json.load(uploaded_file)
                        st.session_state.fireworks = imported_data
                        # Track processed files to prevent infinite loop
                        if "processed_files" not in st.session_state:
                            st.session_state.processed_files = set()
                        st.session_state.processed_files.add(uploaded_file)
                        st.success("Show data imported successfully!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error importing data: {e}")

        else:
            st.info("Add fireworks to see the timeline")

            # Initial load options
            col_sample, col_import = st.columns(2)

            with col_sample:
                if st.button("Load Sample Show"):
                    sample_fireworks = [
                        {
                            "id": "sample1",
                            "name": "Opening Burst",
                            "start_time": 0,
                            "fuse_duration": 2,
                            "explosion_duration": 3,
                            "end_time": 5,
                            "dependent_on": None,
                            "dependency_offset": 0,
                            "cost": 25.00,
                        },
                        {
                            "id": "sample2",
                            "name": "Roman Candle",
                            "start_time": 7,
                            "fuse_duration": 1.5,
                            "explosion_duration": 8,
                            "end_time": 16.5,
                            "dependent_on": "sample1",
                            "dependency_offset": 2,
                            "cost": 45.50,
                        },
                        {
                            "id": "sample3",
                            "name": "Grand Finale",
                            "start_time": 18.5,
                            "fuse_duration": 3,
                            "explosion_duration": 5,
                            "end_time": 26.5,
                            "dependent_on": "sample2",
                            "dependency_offset": 2,
                            "cost": 120.75,
                        },
                    ]
                    st.session_state.fireworks = sample_fireworks
                    st.rerun()

            with col_import:
                uploaded_file = st.file_uploader(
                    "Import JSON Show", type=["json"], key="initial_import"
                )
                if uploaded_file:
                    try:
                        imported_data = json.load(uploaded_file)
                        st.session_state.fireworks = imported_data
                        st.success("Show imported successfully!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Import error: {e}")


if __name__ == "__main__":
    main()
