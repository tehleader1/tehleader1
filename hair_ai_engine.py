import random

def analyze_hair():

    curl_types = ["2A","2B","2C","3A","3B","3C","4A","4B","4C"]

    damage_levels = ["low","medium","high"]

    hydration = ["low","medium","high"]

    result = {

        "curl_type": random.choice(curl_types),

        "damage": random.choice(damage_levels),

        "hydration": random.choice(hydration)

    }

    routine = generate_routine(result)

    result["routine"] = routine

    return result


def generate_routine(data):

    routine = []

    if data["damage"] == "high":
        routine.append("Deep condition twice weekly")

    if data["hydration"] == "low":
        routine.append("Use argan oil daily")

    if data["curl_type"].startswith("4"):
        routine.append("Protective styles recommended")

    routine.append("Avoid heat styling")

    return routine
