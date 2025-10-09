import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface CategoryData {
  name: string;
  value: number;
  percentage: string;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const Analytics = () => {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);
  const [expenseCategoryData, setExpenseCategoryData] = useState<CategoryData[]>([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState<CategoryData[]>([]);
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

    // Fetch expenses
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay.toISOString())
      .lte("date", lastDay.toISOString());

    // Fetch incomes
    const { data: incomes, error: incomeError } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay.toISOString())
      .lte("date", lastDay.toISOString());

    if (expenseError || incomeError) {
      console.error("Error fetching data:", expenseError || incomeError);
      return;
    }

    // Process expenses
    if (expenses) {
      const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      setTotalExpenses(total);
      setTransactionCount(expenses.length + (incomes?.length || 0));
      setAvgTransaction(expenses.length > 0 ? total / expenses.length : 0);

      const categoryMap = new Map<string, number>();
      expenses.forEach((exp) => {
        const current = categoryMap.get(exp.category) || 0;
        categoryMap.set(exp.category, current + Number(exp.amount));
      });

      const expenseChartData: CategoryData[] = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
      }));

      setExpenseCategoryData(expenseChartData);
    }

    // Process incomes
    if (incomes) {
      const total = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
      setTotalIncome(total);

      const categoryMap = new Map<string, number>();
      incomes.forEach((inc) => {
        const current = categoryMap.get(inc.category) || 0;
        categoryMap.set(inc.category, current + Number(inc.amount));
      });

      const incomeChartData: CategoryData[] = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
      }));

      setIncomeCategoryData(incomeChartData);
    }
  };

  const netBalance = totalIncome - totalExpenses;
  const comparisonData = [
    { name: "Income", value: totalIncome, fill: "hsl(var(--success))" },
    { name: "Expenses", value: totalExpenses, fill: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-success/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">₹{totalIncome.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">₹{totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={netBalance >= 0 ? "border-success/50" : "border-destructive/50"}>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netBalance >= 0 ? "text-success" : "text-destructive"}`}>
              ₹{netBalance.toFixed(2)}
            </p>
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
      </div>

      {/* Income vs Expenses Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>Monthly comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {totalIncome === 0 && totalExpenses === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data available. Add income or expenses to see comparison!</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of spending</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategoryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No expense data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {expenseCategoryData.map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{cat.value.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>Sources of income</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeCategoryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No income data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={incomeCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {incomeCategoryData.map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{cat.value.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
