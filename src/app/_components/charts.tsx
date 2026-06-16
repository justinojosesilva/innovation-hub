"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const AXIS = { fontSize: 11, fill: "#9ca3af" };
const TOOLTIP_STYLE = {
  background: "#111827",
  border: "none",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
  padding: "6px 10px",
};

export function TrendArea({ data }: { data: { label: string; cumulative: number }[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: "#6366f1", strokeOpacity: 0.3 }}
            formatter={(value) => [`${value}`, "ideias"]}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricLine({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 2, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CriteriaRadar({ data }: { data: { criterion: string; nota: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#9ca3af" strokeOpacity={0.2} />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar dataKey="nota" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value}/10`, ""]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
