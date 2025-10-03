import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Other"];

const Home = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: CATEGORIES[0],
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchBudget();
    fetchExpenses();
  }, []);

  const fetchBudget = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = format(new Date(), "yyyy-MM-01");
    const { data, error } = await supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (error) {
      console.error("Error fetching budget:", error);
      return;
    }

    setBudget(data?.amount || 0);
  };

  const fetchExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay.toISOString())
      .lte("date", lastDay.toISOString())
      .order("date", { ascending: false });

    if (error) {
      toast.error("Failed to fetch expenses");
      return;
    }

    setExpenses(data || []);
    const total = (data || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
    setTotalSpent(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const expenseData = {
      user_id: user.id,
      title: formData.title,
      amount: Number(formData.amount),
      category: formData.category,
      date: new Date(formData.date).toISOString(),
    };

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingExpense.id);

      if (error) {
        toast.error("Failed to update expense");
        return;
      }
      toast.success("Expense updated!");
    } else {
      const { error } = await supabase.from("expenses").insert([expenseData]);

      if (error) {
        toast.error("Failed to add expense");
        return;
      }
      toast.success("Expense added!");
    }

    setDialogOpen(false);
    setEditingExpense(null);
    setFormData({
      title: "",
      amount: "",
      category: CATEGORIES[0],
      date: format(new Date(), "yyyy-MM-dd"),
    });
    fetchExpenses();
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: format(new Date(expense.date), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete expense");
      return;
    }

    toast.success("Expense deleted!");
    fetchExpenses();
  };

  const budgetPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remaining = budget - totalSpent;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Budget Overview */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Monthly Budget</CardTitle>
          <CardDescription>{format(new Date(), "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-3xl font-bold">₹{budget.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="text-3xl font-bold text-primary">₹{totalSpent.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{budgetPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={budgetPercentage} className="h-3" />
          </div>

          {budgetPercentage >= 90 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">
                {budgetPercentage >= 100 ? "Budget exceeded!" : "Approaching budget limit"}
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className={`text-xl font-bold ${remaining >= 0 ? "text-success" : "text-destructive"}`}>
                ₹{remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Button */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingExpense(null);
          setFormData({
            title: "",
            amount: "",
            category: CATEGORIES[0],
            date: format(new Date(), "yyyy-MM-dd"),
          });
        }
      }}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update your expense details" : "Add a new expense to track"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Lunch"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                {editingExpense ? "Update Expense" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses yet. Add your first expense!</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{expense.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{expense.category}</span>
                      <span>•</span>
                      <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-primary">₹{Number(expense.amount).toFixed(2)}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
