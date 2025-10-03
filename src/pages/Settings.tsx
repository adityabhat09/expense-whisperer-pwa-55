import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Settings = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchUserData();
    fetchBudget();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
    }
  };

  const fetchBudget = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = format(new Date(), "yyyy-MM-01");
    const { data } = await supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (data) {
      setBudget(data.amount.toString());
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = format(new Date(), "yyyy-MM-01");
    const budgetAmount = Number(budget);

    if (budgetAmount <= 0) {
      toast.error("Budget must be greater than 0");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("budgets")
        .update({ amount: budgetAmount })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("budgets")
        .insert([{ user_id: user.id, month: currentMonth, amount: budgetAmount }]));
    }

    if (error) {
      toast.error("Failed to save budget");
    } else {
      toast.success("Budget saved successfully!");
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget</CardTitle>
          <CardDescription>Set your spending limit for {format(new Date(), "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget Amount (₹)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Budget"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardHeader>
          <CardTitle>Logout</CardTitle>
          <CardDescription>Sign out of your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
