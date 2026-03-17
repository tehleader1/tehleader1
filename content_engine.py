import random

def trending_products(products):

    if not products:
        return []

    return random.sample(products,min(len(products),3))


def reorder_suggestions(products):

    suggestions=[]

    for p in products:

        if random.random()>0.7:

            suggestions.append({
                "product":p["title"],
                "reason":"Recommended refill"
            })

    return suggestions
