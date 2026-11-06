"""Writes weather.parquet, a made-up data set to try the viewer with.

    python3 -m pip install pyarrow
    python3 examples/make_demo.py            # writes examples/weather.parquet

Hourly readings from a few weather stations for a year: strings, numbers, timestamps, nulls,
a list column and a struct column, in several row groups with Zstandard compression.
"""

import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

STATIONS = [
    # id, city, country, latitude, longitude, elevation (m), mean temperature (C), yearly swing (C)
    ("HEL-01", "Helsinki", "Finland", 60.17, 24.94, 17, 6.0, 11.0),
    ("LIS-02", "Lisbon", "Portugal", 38.72, -9.14, 77, 17.5, 5.5),
    ("REY-03", "Reykjavik", "Iceland", 64.15, -21.94, 52, 5.0, 5.0),
    ("CAI-04", "Cairo", "Egypt", 30.04, 31.24, 23, 22.5, 7.0),
    ("SYD-05", "Sydney", "Australia", -33.87, 151.21, 39, 18.0, -4.5),
    ("VAN-06", "Vancouver", "Canada", 49.28, -123.12, 70, 10.5, 7.0),
    ("SGP-07", "Singapore", "Singapore", 1.35, 103.82, 15, 27.5, 0.8),
    ("DEN-08", "Denver", "United States", 39.74, -104.99, 1609, 10.5, 11.5),
]
CONDITIONS = ["clear", "partly cloudy", "overcast", "light rain", "rain", "thunderstorm", "fog", "snow"]


def main() -> None:
    rng = random.Random(42)
    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    hours = 365 * 24
    columns = {name: [] for name in [
        "station", "city", "country", "time", "temperature_c", "feels_like_c", "humidity_pct",
        "pressure_hpa", "wind_kmh", "wind_dir", "precip_mm", "condition", "alerts", "location", "note",
    ]}
    for station, city, country, lat, lon, elevation, mean, swing in STATIONS:
        pressure = 1013.0 - elevation / 8.3
        for hour in range(hours):
            when = start + timedelta(hours=hour)
            season = math.cos(2 * math.pi * (hour / 24 - 200) / 365)
            daily = math.cos(2 * math.pi * ((hour % 24) - 15) / 24)
            temperature = mean + swing * season + 3.5 * daily + rng.gauss(0, 1.4)
            humidity = max(8, min(100, int(70 - 1.2 * (temperature - mean) + rng.gauss(0, 9))))
            wind = abs(rng.gauss(14, 7))
            pressure += rng.gauss(0, 0.35) - (pressure - (1013.0 - elevation / 8.3)) * 0.02
            if temperature < 0.5 and humidity > 80:
                condition = "snow"
            elif humidity > 92:
                condition = rng.choice(["fog", "rain", "light rain"])
            elif humidity > 80:
                condition = rng.choice(["overcast", "light rain", "rain", "thunderstorm"] if temperature > 18 else ["overcast", "light rain"])
            else:
                condition = rng.choice(["clear", "clear", "partly cloudy"])
            precip = round(rng.uniform(0.2, 9.0), 1) if condition in ("light rain", "rain", "thunderstorm", "snow") else 0.0
            alerts = []
            if wind > 38:
                alerts.append("wind")
            if temperature > 35:
                alerts.append("heat")
            if temperature < -10:
                alerts.append("frost")
            if condition == "thunderstorm":
                alerts.append("lightning")
            # A sensor that drops out now and then: missing readings are null.
            missing = rng.random() < 0.004
            columns["station"].append(station)
            columns["city"].append(city)
            columns["country"].append(country)
            columns["time"].append(when)
            columns["temperature_c"].append(None if missing else round(temperature, 1))
            columns["feels_like_c"].append(None if missing else round(temperature - 0.12 * wind + 0.03 * (humidity - 50), 1))
            columns["humidity_pct"].append(None if missing else humidity)
            columns["pressure_hpa"].append(round(pressure, 1))
            columns["wind_kmh"].append(round(wind, 1))
            columns["wind_dir"].append(rng.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]))
            columns["precip_mm"].append(precip)
            columns["condition"].append(condition)
            columns["alerts"].append(alerts)
            columns["location"].append({"lat": lat, "lon": lon, "elevation_m": elevation})
            columns["note"].append("sensor offline" if missing else None)

    schema = pa.schema([
        ("station", pa.string()),
        ("city", pa.string()),
        ("country", pa.string()),
        ("time", pa.timestamp("ms", tz="UTC")),
        ("temperature_c", pa.float32()),
        ("feels_like_c", pa.float32()),
        ("humidity_pct", pa.int8()),
        ("pressure_hpa", pa.float32()),
        ("wind_kmh", pa.float32()),
        ("wind_dir", pa.string()),
        ("precip_mm", pa.float32()),
        ("condition", pa.dictionary(pa.int8(), pa.string())),
        ("alerts", pa.list_(pa.string())),
        ("location", pa.struct([("lat", pa.float64()), ("lon", pa.float64()), ("elevation_m", pa.int16())])),
        ("note", pa.string()),
    ], metadata={"source": "made-up readings from examples/make_demo.py", "license": "CC0-1.0"})
    columns["condition"] = pa.array(columns["condition"]).dictionary_encode()
    table = pa.table({name: columns[name] for name in schema.names}, schema=schema)
    out = Path(__file__).with_name("weather.parquet")
    pq.write_table(table, out, compression="zstd", row_group_size=8760, write_statistics=True, write_page_index=True)
    print(f"{out}: {table.num_rows:,} rows, {table.num_columns} columns, {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
