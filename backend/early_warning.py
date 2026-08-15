import json
import math
import pandas as pd


# ==========================================
# FILES
# ==========================================

TRACKING_PATH = "videos/zone_tracking.csv"

FLOW_PATH = "videos/zone_flow.csv"

CONFIG_PATH = "backend/venue_config.json"

OUTPUT_PATH = "videos/early_warning.csv"


# ==========================================
# ZONE NAME MAPPING
# ==========================================

ZONE_NAME_MAP = {
    "Zone 1": "Left Walkway",
    "Zone 2": "Main Walkway",
    "Zone 3": "Right Walkway"
}


# ==========================================
# LOAD CONFIGURATION
# ==========================================

print("Loading venue configuration...")

with open(
    CONFIG_PATH,
    "r"
) as file:

    config = json.load(file)


zones_config = config["zones"]

thresholds = config["density_thresholds"]


# ==========================================
# LOAD TRACKING DATA
# ==========================================

print("Loading tracking data...")

tracking = pd.read_csv(
    TRACKING_PATH
)


# ==========================================
# MAP TRACKING ZONES
# ==========================================

tracking["zone_name"] = (
    tracking["zone"]
    .map(ZONE_NAME_MAP)
)


# ==========================================
# CURRENT OCCUPANCY
# ==========================================

latest_frame = tracking[
    "frame"
].max()


latest_tracking = tracking[
    tracking["frame"] == latest_frame
].copy()


# Ignore people outside zones

latest_tracking = latest_tracking[
    latest_tracking["zone"] != "Outside"
]


# Count unique tracked people

occupancy = (
    latest_tracking
    .dropna(subset=["zone_name"])
    .groupby("zone_name")["person_id"]
    .nunique()
    .to_dict()
)


print(
    f"Latest frame: {latest_frame}"
)


# ==========================================
# LOAD FLOW DATA
# ==========================================

print("Loading flow data...")

flow = pd.read_csv(
    FLOW_PATH
)


# ==========================================
# MAP FLOW ZONES
# ==========================================

flow["zone_name"] = (
    flow["zone"]
    .map(ZONE_NAME_MAP)
)


# ==========================================
# CURRENT MINUTE
# ==========================================

if len(flow) > 0:

    latest_minute = flow[
        "minute"
    ].max()

    latest_flow = flow[
        flow["minute"] == latest_minute
    ].copy()

else:

    latest_minute = 0

    latest_flow = pd.DataFrame()


# ==========================================
# ANALYZE EACH ZONE
# ==========================================

results = []


for zone_name, zone_info in zones_config.items():

    # --------------------------------------
    # Physical configuration
    # --------------------------------------

    area = float(
        zone_info.get(
            "area_m2",
            0
        )
    )


    capacity = float(
        zone_info.get(
            "capacity",
            0
        )
    )


    # --------------------------------------
    # Current occupancy
    # --------------------------------------

    people = int(
        occupancy.get(
            zone_name,
            0
        )
    )


    # --------------------------------------
    # Density
    # --------------------------------------

    if area > 0:

        density = (
            people / area
        )

    else:

        density = 0


    # --------------------------------------
    # Capacity usage
    # --------------------------------------

    if capacity > 0:

        capacity_usage = (
            people / capacity
        )

    else:

        capacity_usage = 0


    # --------------------------------------
    # Current flow
    # --------------------------------------

    entries = 0

    exits = 0


    if len(latest_flow) > 0:

        zone_flow = latest_flow[
            latest_flow["zone_name"]
            == zone_name
        ]


        if len(zone_flow) > 0:

            entries = float(
                zone_flow.iloc[0][
                    "entries_per_minute"
                ]
            )

            exits = float(
                zone_flow.iloc[0][
                    "exits_per_minute"
                ]
            )


    net_flow = (
        entries - exits
    )


    # ======================================
    # TIME TO CAPACITY
    # ======================================

    remaining_capacity = (
        capacity - people
    )


    if (
        net_flow > 0
        and remaining_capacity > 0
    ):

        minutes_to_capacity = (
            remaining_capacity
            / net_flow
        )

    elif (
        people >= capacity
        and capacity > 0
    ):

        minutes_to_capacity = 0

    else:

        minutes_to_capacity = math.inf


    # ======================================
    # RISK SCORE
    # ======================================

    # ======================================
    # FORWARD-LOOKING RISK SCORE
    # ======================================

    risk_score = 0


    # ======================================
    # 1. CURRENT CAPACITY PRESSURE
    # ======================================

    current_capacity_usage = (
        people / capacity
        if capacity > 0
        else 0
    )


    if current_capacity_usage >= 1.0:

        risk_score += 25

    elif current_capacity_usage >= 0.80:

        risk_score += 20

    elif current_capacity_usage >= 0.60:

        risk_score += 15

    elif current_capacity_usage >= 0.40:

        risk_score += 8


    # ======================================
    # 2. CURRENT DENSITY
    # ======================================

    if density >= thresholds["critical"]:

        risk_score += 20

    elif density >= thresholds["high"]:

        risk_score += 15

    elif density >= thresholds["medium"]:

        risk_score += 8


    # ======================================
    # 3. CROWD GROWTH
    # ======================================

    if net_flow >= 10:

        risk_score += 20

    elif net_flow >= 5:

        risk_score += 15

    elif net_flow >= 2:

        risk_score += 8


    # ======================================
    # 4. TIME TO CAPACITY
    # ======================================

    if (
        minutes_to_capacity != math.inf
    ):

        if minutes_to_capacity <= 5:

            risk_score += 35

        elif minutes_to_capacity <= 10:

            risk_score += 30

        elif minutes_to_capacity <= 15:

            risk_score += 20

        elif minutes_to_capacity <= 30:

            risk_score += 10


    # ======================================
    # 5. FUTURE CAPACITY PROJECTION
    # ======================================

    if net_flow > 0 and capacity > 0:

        predicted_5 = (
            people
            +
            net_flow * 5
        )

        predicted_10 = (
            people
            +
            net_flow * 10
        )


        predicted_5_usage = (
            predicted_5 / capacity
        )

        predicted_10_usage = (
            predicted_10 / capacity
        )


        # Future capacity breach
        if predicted_10_usage >= 1.0:

            risk_score += 20

        elif predicted_10_usage >= 0.80:

            risk_score += 12

        elif predicted_10_usage >= 0.60:

            risk_score += 6


    # ======================================
    # CAP SCORE
    # ======================================

    risk_score = min(
        int(risk_score),
        100
    )
    # ======================================
    # RISK LEVEL
    # ======================================

    if risk_score >= 70:

        risk_level = "CRITICAL"

    elif risk_score >= 50:

        risk_level = "HIGH"

    elif risk_score >= 25:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    # ======================================
    # PREDICTION
    # ======================================

    if (
        minutes_to_capacity != math.inf
        and minutes_to_capacity <= 5
        and net_flow > 0
    ):

        prediction = (
            "CONGESTION EXPECTED "
            "WITHIN 5 MINUTES"
        )

    elif (
        minutes_to_capacity != math.inf
        and minutes_to_capacity <= 10
        and net_flow > 0
    ):

        prediction = (
            "CONGESTION DEVELOPING"
        )

    elif net_flow >= 2:

        prediction = (
            "CROWD ACCUMULATING"
        )

    elif net_flow <= -2:

        prediction = (
            "ZONE CLEARING"
        )

    else:

        prediction = (
            "NO IMMEDIATE RISK"
        )


    # ======================================
    # RECOMMENDATION
    # ======================================

    if risk_level == "CRITICAL":

        recommendation = (
            "IMMEDIATE CROWD MANAGEMENT"
        )

    elif risk_level == "HIGH":

        recommendation = (
            "PREPARE CROWD REDIRECTION"
        )

    elif (
        risk_level == "MEDIUM"
        and net_flow > 0
    ):

        recommendation = (
            "MONITOR ACCUMULATION"
        )

    else:

        recommendation = (
            "NORMAL MONITORING"
        )


    # ======================================
    # STORE RESULT
    # ======================================

    results.append({

        "zone": zone_name,

        "people": people,

        "area_m2": area,

        "density_people_m2": density,

        "capacity": capacity,

        "capacity_usage": capacity_usage,

        "entries_per_minute": entries,

        "exits_per_minute": exits,

        "net_flow_per_minute": net_flow,

        "minutes_to_capacity": (
            None
            if minutes_to_capacity == math.inf
            else minutes_to_capacity
        ),

        "risk_score": risk_score,

        "risk_level": risk_level,

        "prediction": prediction,

        "recommendation": recommendation

    })


# ==========================================
# CREATE DATAFRAME
# ==========================================

results_df = pd.DataFrame(
    results
)


# ==========================================
# SAVE
# ==========================================

results_df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ==========================================
# PRINT DASHBOARD
# ==========================================

print()
print("--------------------------------")
print("CROWDFLOW EARLY WARNING")
print("--------------------------------")


for _, row in results_df.iterrows():

    print()

    print(
        f"ZONE: {row['zone']}"
    )

    print(
        f"People: "
        f"{int(row['people'])}"
    )

    print(
        f"Density: "
        f"{row['density_people_m2']:.3f} people/m²"
    )

    print(
        f"Capacity: "
        f"{row['capacity_usage'] * 100:.1f}%"
    )

    print(
        f"IN: "
        f"{row['entries_per_minute']:.1f}/min"
    )

    print(
        f"OUT: "
        f"{row['exits_per_minute']:.1f}/min"
    )

    print(
        f"NET: "
        f"{row['net_flow_per_minute']:+.1f}/min"
    )


    if pd.isna(
        row["minutes_to_capacity"]
    ):

        print(
            "Time to capacity: N/A"
        )

    else:

        print(
            f"Time to capacity: "
            f"{row['minutes_to_capacity']:.1f} min"
        )


    print(
        f"Risk: "
        f"{row['risk_level']} "
        f"({int(row['risk_score'])}/100)"
    )

    print(
        f"Prediction: "
        f"{row['prediction']}"
    )

    print(
        f"Action: "
        f"{row['recommendation']}"
    )


# ==========================================
# HIGHEST RISK ZONE
# ==========================================

if len(results_df) > 0:

    highest = results_df.sort_values(
        "risk_score",
        ascending=False
    ).iloc[0]


    print()
    print("--------------------------------")
    print("HIGHEST RISK ZONE")
    print("--------------------------------")


    print(
        f"Zone: {highest['zone']}"
    )

    print(
        f"Risk: "
        f"{highest['risk_level']}"
    )

    print(
        f"Score: "
        f"{int(highest['risk_score'])}/100"
    )

    print(
        f"Prediction: "
        f"{highest['prediction']}"
    )


# ==========================================
# COMPLETE
# ==========================================

print()
print("--------------------------------")
print("EARLY WARNING COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")