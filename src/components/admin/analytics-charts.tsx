"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/cn";

export function AnalyticsCharts(props: {
  revenueRows: Array<{ day: string; revenue: number }>;
  statusRows: Array<{ status: string; count: number }>;
  topProducts: Array<{ name: string; qty: number }>;
  zoneDemand: Array<{ zone: string; orders_count: number }>;
}) {
  const borderColor = "hsl(var(--border))";
  const mutedColor = "hsl(var(--muted-foreground))";
  const primaryColor = "hsl(var(--primary))";
  const pieColors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--secondary-foreground))",
    "hsl(var(--muted-foreground))"
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={props.revenueRows}>
                <CartesianGrid stroke={borderColor} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: mutedColor }} />
                <YAxis tick={{ fill: mutedColor }} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    border: `1px solid ${borderColor}`,
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))"
                  }}
                />
                <Bar dataKey="revenue" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Status Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    border: `1px solid ${borderColor}`,
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))"
                  }}
                />
                <Pie data={props.statusRows} dataKey="count" nameKey="status" outerRadius={100} label>
                  {props.statusRows.map((row, index) => (
                    <Cell key={row.status} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {props.topProducts.map((product) => (
              <li key={product.name} className="flex justify-between rounded-md bg-secondary/30 px-3 py-2">
                <span>{product.name}</span>
                <strong>{product.qty}</strong>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone Demand</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {props.zoneDemand.map((zone) => (
              <li key={zone.zone} className="flex justify-between rounded-md bg-secondary/30 px-3 py-2">
                <span>{zone.zone}</span>
                <strong>{zone.orders_count}</strong>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
