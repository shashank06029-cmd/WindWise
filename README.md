# WindWise – Wind Forecast Dashboard

WindWise is a web dashboard for comparing day-ahead wind generation forecasts with actual wind generation in Great Britain.

## Features
- Select a date in January 2026.
- View forecast and actual wind generation.
- Compare values across matched settlement periods.
- Calculate Mean Absolute Error (MAE).
- View forecast publication time.

## Tech Stack
- **Frontend:** React, Vite
- **Backend:** Python, FastAPI
- **Data Source:** Elexon BMRS API
- **Deployment:** Docker Compose

## Run Locally with Docker

Prerequisite: Docker Desktop.

```bash
docker compose up --build
```

Open:
- Dashboard: http://localhost:5173
- API health check: http://localhost:8000/api/health
- API documentation: http://localhost:8000/docs

Stop the containers:

```bash
docker compose down
```

## Data and Accuracy

The dashboard uses Elexon data to compare day-ahead wind forecasts with actual generation for January 2026. MAE is calculated using matched forecast and actual values. Forecast values may be shared across adjacent half-hour periods.

## AI Disclosure

AI assistance was used during development for coding support and troubleshooting. The project was tested locally using Docker.

## Demo Video

Watch the WindWise project demonstration: [WindWise Demo Video](https://youtu.be/htBNW-DimwA)

**Note:** If the video does not open in your regular browser, please try opening the link in an Incognito/Private window.


## Live Application

- **Frontend:** https://windwise-dashboard.onrender.com/
- **Backend Health Check:** https://windwise-backend-b3x2.onrender.com/api/health
