
from datetime import date, datetime, time, timedelta, timezone
from collections import defaultdict

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WindWise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = "https://data.elexon.co.uk/bmrs/api/v1"


def get_rows(payload):
    if isinstance(payload, dict):
        return payload.get("data", [])
    return payload if isinstance(payload, list) else []


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/wind")
async def wind(day: date):
    if day.year != 2026 or day.month != 1:
        raise HTTPException(400, "Choose a date in January 2026")

    previous_day = day - timedelta(days=1)

    publish_from = f"{previous_day.isoformat()}T00:00:00Z"
    publish_to = f"{day.isoformat()}T00:00:00Z"

    async with httpx.AsyncClient(timeout=90) as client:
        try:
            actual_response = await client.get(
                f"{BASE}/datasets/FUELHH",
                params={
                    "settlementDateFrom": day.isoformat(),
                    "settlementDateTo": day.isoformat(),
                    "format": "json",
                },
            )
            actual_response.raise_for_status()

            forecast_response = await client.get(
                f"{BASE}/datasets/DGWS",
                params={
                    "PublishDateTimeFrom": publish_from,
                    "PublishDateTimeTo": publish_to,
                    "format": "json",
                },
            )
            forecast_response.raise_for_status()

            actual_rows = get_rows(actual_response.json())
            forecast_rows = get_rows(forecast_response.json())

        except (httpx.HTTPError, ValueError) as exc:
            raise HTTPException(
                502, f"Elexon API request failed: {exc}"
            ) from exc

    # Actual wind generation, preserving half-hourly timestamps.
    actuals = {}

    for row in actual_rows:
        if (
            row.get("fuelType") == "WIND"
            and row.get("generation") is not None
            and row.get("startTime")
        ):
            actuals[row["startTime"]] = float(row["generation"])

    # Keep day-ahead wind forecasts published before the delivery date.
    # DGWS reports onshore and offshore wind separately.
    selected = {}

    for row in forecast_rows:
        if row.get("businessType") != "Wind generation":
            continue

        if row.get("processType") != "Day ahead":
            continue

        if row.get("psrType") not in ("Wind Onshore", "Wind Offshore"):
            continue

        if row.get("settlementDate") != day.isoformat():
            continue

        if row.get("quantity") is None or not row.get("startTime"):
            continue

        published = row.get("publishTime")
        if not published:
            continue

        try:
            published_at = parse_time(published)
        except ValueError:
            continue

        if published_at >= datetime.combine(
            day, time.min, tzinfo=timezone.utc
        ):
            continue

        key = (row["startTime"], row["psrType"])
        rank = (
            published_at,
            row.get("documentRevisionNumber", 0),
        )

        if key not in selected or rank > selected[key][0]:
            selected[key] = (
                rank,
                float(row["quantity"]),
                published,
            )

    # Combine onshore + offshore into total wind forecast per half-hour.
    forecast_totals = defaultdict(float)
    publication_times = defaultdict(list)
    forecast_types = defaultdict(set)

    for (start_time, psr_type), (_, quantity, published) in selected.items():
        forecast_totals[start_time] += quantity
        publication_times[start_time].append(published)
        forecast_types[start_time].add(psr_type)

    points = []

    for start_time in sorted(set(actuals) & set(forecast_totals)):
        forecast = forecast_totals[start_time]
        actual = actuals[start_time]

        points.append({
            "startTime": start_time,
            "forecast": round(forecast, 2),
            "actual": round(actual, 2),
            "error": round(forecast - actual, 2),
            "absoluteError": round(abs(forecast - actual), 2),
            "publishTime": max(publication_times[start_time]),
        })

    mae = (
        sum(point["absoluteError"] for point in points) / len(points)
        if points
        else None
    )

    unique_publications = sorted({
        point["publishTime"] for point in points
    })

    return {
        "date": day.isoformat(),
        "actualRecords": len(actuals),
        "forecastPeriods": len(forecast_totals),
        "matchedPeriods": len(points),
        "resolution": "30 minutes",
        "mae": round(mae, 2) if mae is not None else None,
        "publicationTimes": unique_publications,
        "points": points,
        "message": (
            None if points
            else "No matching half-hourly day-ahead forecast records found."
        ),
    }
