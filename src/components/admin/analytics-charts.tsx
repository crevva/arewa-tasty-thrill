"use client";

import {
  Bar,
  BarChart,
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#5d0f2f" radius={[6, 6, 0, 0]} />
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
                <Tooltip />
                <Pie data={props.statusRows} dataKey="count" nameKey="status" outerRadius={100} fill="#f97316" label />
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
