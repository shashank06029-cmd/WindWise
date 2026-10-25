
import { useEffect, useMemo, useState } from 'react'
import {
  Wind,
  Zap,
  Target,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

import './App.css'

const API_URL = 'http://localhost:8000/api/wind'

function App() {
  const [date, setDate] = useState('2026-01-15')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}?day=${encodeURIComponent(date)}`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to load Elexon data')
      }

      setData(result)
    } catch (err) {
      setData(null)
      setError(err.message || 'Could not connect to the backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [date])

  const chartData = useMemo(() => {
    if (!data?.points) return []

    return data.points.map(point => ({
      ...point,
      time: new Date(point.startTime).toISOString().slice(11, 16)
    }))
  }, [data])

  const average = values =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null

  const avgForecast = average(chartData.map(point => point.forecast))
  const avgActual = average(chartData.map(point => point.actual))

  const coverage = data?.actualRecords
    ? (data.matchedPeriods / data.actualRecords) * 100
    : 0

  const formatMW = value =>
    value == null ? '—' : Math.round(value).toLocaleString('en-GB')

  const publicationTime = chartData[0]?.publishTime
    ? `${new Date(chartData[0].publishTime).toLocaleString('en-GB', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
      })} UTC`
    : 'See API records'

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Wind size={24} />
          </div>

          <div>
            <h2>WindWise</h2>
            <span>Renewable Intelligence</span>
          </div>
        </div>

        <div className="status">
          <span /> Elexon Wind Analytics
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">ENERGY PROCUREMENT · UK</p>

          <h1>Wind Generation Insights</h1>

          <p className="subtitle">
            Compare day-ahead wind generation forecasts with measured output
            to support electricity purchasing decisions.
          </p>
        </div>

        <label className="date-filter">
          <CalendarDays size={18} />

          <input
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </label>
      </section>

      <section className="notice">
        <div>
          <RefreshCw size={18} />
        </div>

        <p>
          <strong>January 2026 · Historical analysis</strong>
          <br />

          {loading
            ? 'Loading data from the Elexon BMRS API...'
            : error
              ? 'Data could not be loaded.'
              : data
                ? `${data.matchedPeriods} matched 30-minute periods · Forecast publication: ${publicationTime}`
                : 'Waiting for data.'}
        </p>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          aria-label="Refresh data"
        >
          <RefreshCw size={16} />
        </button>
      </section>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />

          <span>
            {error}. Check that the backend is running on port 8000.
          </span>
        </div>
      )}

      <section className="metrics">
        <article className="metric">
          <div className="metric-top">
            <span>Average forecast</span>
            <Wind />
          </div>

          <h2>
            {formatMW(avgForecast)} <small>MW</small>
          </h2>

          <p>Matched periods only</p>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Average actual</span>
            <Zap />
          </div>

          <h2>
            {formatMW(avgActual)} <small>MW</small>
          </h2>

          <p>Measured wind output</p>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Mean absolute error (MAE)</span>
            <Target />
          </div>

          <h2>
            {data?.mae == null ? '—' : formatMW(data.mae)} <small>MW</small>
          </h2>

          <p>Average absolute forecast error</p>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Forecast coverage</span>
            <TrendingUp />
          </div>

          <h2>
            {data ? coverage.toFixed(1) : '—'} <small>%</small>
          </h2>

          <p>
            {data?.matchedPeriods ?? 0} of {data?.actualRecords ?? 0} actual
            records matched
          </p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Forecast vs actual generation</h3>
            <p>Official Elexon data · MW</p>
          </div>

          <span className="tag">30-minute matched periods</span>
        </div>

        <div className="chart">
          {loading ? (
            <p>Loading chart...</p>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                  tickFormatter={value => value}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={value => `${(value / 1000).toFixed(0)}k`}
                />

                <Tooltip
                  formatter={value => [
                    `${Number(value).toLocaleString('en-GB')} MW`
                  ]}
                  labelFormatter={label => `Time: ${label} UTC`}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Day-ahead forecast"
                  stroke="#4778ee"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />

                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual generation"
                  stroke="#14a77a"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>
              {error ||
                data?.message ||
                'No matched records available for this date.'}
            </p>
          )}
        </div>

        <p className="disclaimer">
          Source: Elexon BMRS. MAE is calculated from matched forecast and
          actual timestamps. Coverage is based on matched 30-minute periods.
          Day-ahead forecast values may be shared across adjacent half-hour
          periods.
        </p>
      </section>

      <footer>
        <span>WindWise · Day-ahead procurement support</span>
        <span>Elexon BMRS · January 2026</span>
      </footer>
    </main>
  )
}

export default App
