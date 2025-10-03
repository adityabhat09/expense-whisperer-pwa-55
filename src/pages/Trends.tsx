import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyData {
  month: string;
  total: number;
}

const Trends = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get last 6 months of data
    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const firstDay = startOfMonth(date);
      const lastDay = endOfMonth(date);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", firstDay.toISOString())
        .lte("date", lastDay.toISOString());

      const total = (expenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
      months.push({
        month: format(date, "MMM"),
        total,
      });
    }

    setMonthlyData(months);
  };

  const maxValue = Math.max(...monthlyData.map((d) => d.total), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Spending Trends</h1>
        <p className="text-muted-foreground">Your monthly spending over time</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 || maxValue === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data available. Add some expenses to see trends!</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Monthly List */}
              <div className="mt-6 space-y-3">
                {monthlyData.map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-lg font-bold text-primary">₹{month.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Trends;
