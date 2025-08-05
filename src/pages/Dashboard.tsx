import { useMemo, useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useFinance } from "@/hooks/useFinance";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { X } from "lucide-react";

export default function Dashboard() {
  const { transactions, categories, loading } = useFinance();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Prepare data for current month
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Daily spending data for bar chart
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      let dayTransactions = transactions.filter(t => t.type === 'expense' && t.date === dayStr);
      
      // Apply category filter if selected
      if (selectedCategoryId) {
        dayTransactions = dayTransactions.filter(t => t.category_id === selectedCategoryId);
      }
      
      const dayExpenses = dayTransactions
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        date: format(day, 'MMM dd'),
        amount: dayExpenses
      };
    }).filter(d => d.amount > 0);
  }, [transactions, monthStart, monthEnd, selectedCategoryId]);

  // Category-wise expenses for pie chart
  const categoryData = useMemo(() => {
    const categoryExpenses = new Map();
    
    transactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(transaction => {
        const categoryName = transaction.category!.name;
        const current = categoryExpenses.get(categoryName) || 0;
        categoryExpenses.set(categoryName, current + transaction.amount);
      });

    return Array.from(categoryExpenses.entries()).map(([name, amount], index) => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        value: amount,
        color: category?.color || `hsl(${index * 45}, 70%, 50%)`
      };
    });
  }, [transactions, categories]);

  // Monthly summary
  const monthlyStats = useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });

    let filteredTransactions = currentMonthTransactions;
    
    // Apply category filter for expenses if selected
    if (selectedCategoryId) {
      filteredTransactions = currentMonthTransactions.map(t => {
        if (t.type === 'expense' && t.category_id !== selectedCategoryId) {
          return { ...t, amount: 0 }; // Zero out non-matching expenses
        }
        return t;
      });
    }

    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const savings = filteredTransactions
      .filter(t => t.type === 'savings_transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, savings };
  }, [transactions, monthStart, monthEnd, selectedCategoryId]);

  const clearFilter = () => {
    setSelectedCategoryId('');
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">{format(currentMonth, 'MMMM yyyy')}</p>
          </div>
          <Link to="/compare">
            <Button variant="outline" size="sm">
              Compare
            </Button>
          </Link>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-sm font-semibold text-success">${monthlyStats.income.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-sm font-semibold text-destructive">${monthlyStats.expenses.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Saved</p>
              <p className="text-sm font-semibold text-info">${monthlyStats.savings.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Spending Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                Daily Spending
                {selectedCategory && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {selectedCategory.name}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {selectedCategoryId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilter}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 && selectedCategoryId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No expenses found for {selectedCategory?.name} this month</p>
                <Button variant="ghost" size="sm" onClick={clearFilter} className="mt-2">
                  Clear filter to see all expenses
                </Button>
              </div>
            ) : dailyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No expenses recorded this month</p>
              </div>
            ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Amount']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill={selectedCategory ? selectedCategory.color : "hsl(var(--primary))"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Pie Chart */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend for categories */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {categoryData.map((category) => (
                  <div key={category.name} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                    <span className="text-sm font-semibold ml-auto">${category.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}