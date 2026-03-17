import requests

def find_salons(lat,lon):

    url="https://nominatim.openstreetmap.org/search"

    params={
        "q":"hair salon",
        "format":"json",
        "limit":5,
        "lat":lat,
        "lon":lon
    }

    r=requests.get(url,params=params)

    data=r.json()

    salons=[]

    for s in data:

        salons.append({

            "name":s["display_name"],
            "lat":s["lat"],
            "lon":s["lon"]

        })

    return salons
