import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyData {
  month: string;
  expenses: number;
  income: number;
  net: number;
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

      const { data: incomes } = await supabase
        .from("incomes")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", firstDay.toISOString())
        .lte("date", lastDay.toISOString());

      const expenseTotal = (expenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
      const incomeTotal = (incomes || []).reduce((sum, inc) => sum + Number(inc.amount), 0);
      
      months.push({
        month: format(date, "MMM"),
        expenses: expenseTotal,
        income: incomeTotal,
        net: incomeTotal - expenseTotal,
      });
    }

    setMonthlyData(months);
  };

  const hasData = monthlyData.some((d) => d.expenses > 0 || d.income > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Financial Trends</h1>
        <p className="text-muted-foreground">Your income and expenses over time</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Income & Expenses</CardTitle>
          <CardDescription>Last 6 months comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-center text-muted-foreground py-12">No data available. Add income or expenses to see trends!</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Net Balance"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Monthly Details */}
              <div className="mt-6 space-y-3">
                {monthlyData.map((month) => (
                  <div key={month.month} className="grid grid-cols-4 gap-4 p-3 rounded-lg border">
                    <span className="font-medium">{month.month}</span>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Income</p>
                      <p className="font-bold text-success">₹{month.income.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Expenses</p>
                      <p className="font-bold text-destructive">₹{month.expenses.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Net</p>
                      <p className={`font-bold ${month.net >= 0 ? "text-success" : "text-destructive"}`}>
                        ₹{month.net.toFixed(2)}
                      </p>
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

export default Trends;
