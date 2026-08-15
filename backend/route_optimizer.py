import json
import heapq
import pandas as pd


# ==========================================
# FILES
# ==========================================

GRAPH_PATH = "backend/venue_graph.json"

PREDICTION_PATH = "videos/crowd_prediction.csv"

OUTPUT_PATH = "videos/routes.csv"


# ==========================================
# ROUTING WEIGHTS
# ==========================================

# How strongly crowd conditions affect
# route selection.

OCCUPANCY_WEIGHT = 4.0

PREDICTED_OCCUPANCY_WEIGHT = 2.0

RISK_WEIGHT = 0.5


# ==========================================
# LOAD VENUE GRAPH
# ==========================================

print("Loading venue graph...")

with open(
    GRAPH_PATH,
    "r"
) as file:

    graph_data = json.load(file)


nodes = graph_data["nodes"]

edges = graph_data["edges"]


# ==========================================
# LOAD CROWD PREDICTION
# ==========================================

print("Loading crowd prediction...")

prediction = pd.read_csv(
    PREDICTION_PATH
)


# ==========================================
# BUILD GRAPH
# ==========================================

graph = {
    node: []
    for node in nodes
}


for edge in edges:

    source = edge["from"]

    destination = edge["to"]

    distance = float(
        edge["distance_m"]
    )


    graph[source].append(
        (
            destination,
            distance
        )
    )


    graph[destination].append(
        (
            source,
            distance
        )
    )


# ==========================================
# CREATE NODE CROWD DATA
# ==========================================

node_people = {
    node: 0
    for node in nodes
}

node_predicted_people = {
    node: 0
    for node in nodes
}

node_risk = {
    node: 0
    for node in nodes
}


# ==========================================
# READ PREDICTIONS
# ==========================================

for _, row in prediction.iterrows():

    zone = str(
        row["zone"]
    )


    # --------------------------------------
    # Current occupancy
    # --------------------------------------

    current_people = float(
        row["current_people"]
    )


    if pd.notna(
        row["predicted_people_5_min"]
    ):

        predicted_people = float(
            row["predicted_people_5_min"]
        )

    else:

        predicted_people = current_people


    # --------------------------------------
    # Risk
    # --------------------------------------

    risk_score = 0


    if pd.notna(
        row.get("risk_score", float("nan"))
    ):

        risk_score = float(
            row["risk_score"]
        )


    # --------------------------------------
    # Only use zones that are also graph
    # nodes
    # --------------------------------------

    if zone in node_people:

        node_people[zone] = (
            current_people
        )

        node_predicted_people[zone] = (
            predicted_people
        )

        node_risk[zone] = (
            risk_score
        )


# ==========================================
# PRINT CROWD INFORMATION
# ==========================================

print()
print("--------------------------------")
print("ROUTING CROWD CONDITIONS")
print("--------------------------------")


for node in nodes:

    people = node_people[node]

    predicted = node_predicted_people[node]

    risk = node_risk[node]


    print(
        f"{node}: "
        f"Current={people:.0f} "
        f"| Predicted 5min={predicted:.1f} "
        f"| Risk={risk:.0f}"
    )


# ==========================================
# NODE CROWD PENALTY
# ==========================================

def crowd_penalty(node):

    current_people = (
        node_people.get(
            node,
            0
        )
    )


    predicted_people = (
        node_predicted_people.get(
            node,
            0
        )
    )


    risk = (
        node_risk.get(
            node,
            0
        )
    )


    penalty = (

        current_people
        * OCCUPANCY_WEIGHT

        +

        predicted_people
        * PREDICTED_OCCUPANCY_WEIGHT

        +

        risk
        * RISK_WEIGHT

    )


    return penalty


# ==========================================
# PRINT PENALTIES
# ==========================================

print()
print("--------------------------------")
print("ROUTE PENALTIES")
print("--------------------------------")


for node in nodes:

    penalty = crowd_penalty(
        node
    )


    print(
        f"{node}: "
        f"{penalty:.2f}"
    )


# ==========================================
# FIND BEST ROUTE
# ==========================================

def find_route(
    start,
    destination
):

    queue = [

        (
            0,
            start,
            [start]
        )

    ]


    visited = set()


    while queue:

        cost, current, path = (
            heapq.heappop(
                queue
            )
        )


        if current in visited:

            continue


        visited.add(
            current
        )


        # ----------------------------------
        # Destination reached
        # ----------------------------------

        if current == destination:

            return cost, path


        # ----------------------------------
        # Explore neighbours
        # ----------------------------------

        for neighbour, distance in graph.get(
            current,
            []
        ):

            if neighbour in visited:

                continue


            # --------------------------------
            # Physical distance
            # --------------------------------

            distance_cost = distance


            # --------------------------------
            # Crowd conditions
            # --------------------------------

            crowd_cost = (
                crowd_penalty(
                    neighbour
                )
            )


            # --------------------------------
            # Total edge cost
            # --------------------------------

            new_cost = (

                cost

                +

                distance_cost

                +

                crowd_cost

            )


            heapq.heappush(

                queue,

                (
                    new_cost,
                    neighbour,
                    path + [neighbour]
                )

            )


    return None, []


# ==========================================
# START / DESTINATION
# ==========================================

START = "Entry"

DESTINATION = "Exit"


# ==========================================
# OPTIMIZE
# ==========================================

cost, route = find_route(
    START,
    DESTINATION
)


# ==========================================
# PRINT RESULT
# ==========================================

print()
print("--------------------------------")
print("CROWDFLOW ROUTE OPTIMIZATION")
print("--------------------------------")


print(
    f"Start: {START}"
)


print(
    f"Destination: {DESTINATION}"
)


if route:

    print()
    print(
        "Recommended route:"
    )

    print(
        " → ".join(route)
    )

    print()

    print(
        f"Route cost: {cost:.2f}"
    )

else:

    print()
    print(
        "No route available."
    )


# ==========================================
# SAVE RESULT
# ==========================================

route_row = {

    "start": START,

    "destination": DESTINATION,

    "recommended_route": (
        " → ".join(route)
        if route
        else ""
    ),

    "route_cost": cost

}


pd.DataFrame(
    [route_row]
).to_csv(
    OUTPUT_PATH,
    index=False
)


# ==========================================
# COMPLETE
# ==========================================

print()
print("--------------------------------")
print("ROUTE OPTIMIZATION COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")