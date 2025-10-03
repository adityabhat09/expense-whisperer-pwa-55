import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format } from "date-fns";

interface CategoryData {
  name: string;
  value: number;
  percentage: string;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const Analytics = () => {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay.toISOString())
      .lte("date", lastDay.toISOString());

    if (error || !expenses) {
      console.error("Error fetching expenses:", error);
      return;
    }

    // Calculate totals
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    setTotalExpenses(total);
    setTransactionCount(expenses.length);
    setAvgTransaction(expenses.length > 0 ? total / expenses.length : 0);

    // Calculate category breakdown
    const categoryMap = new Map<string, number>();
    expenses.forEach((exp) => {
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + Number(exp.amount));
    });

    const chartData: CategoryData[] = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / total) * 100).toFixed(1),
    }));

    setCategoryData(chartData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">₹{totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{transactionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg per Transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">₹{avgTransaction.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Breakdown of your monthly expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data available. Add some expenses to see analytics!</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              {/* Category List */}
              <div className="mt-6 space-y-3">
                {categoryData.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{cat.value.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{cat.percentage}%</p>
                    </div>
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

export default Analytics;
