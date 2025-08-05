import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useFinance } from "@/hooks/useFinance";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export default function Compare() {
  const { transactions, categories, loading } = useFinance();
  const [compareType, setCompareType] = useState<'days' | 'months' | 'years'>('days');
  const [leftPeriod, setLeftPeriod] = useState('');
  const [rightPeriod, setRightPeriod] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Generate period options based on compare type
  const periodOptions = useMemo(() => {
    const dates = [...new Set(transactions.map(t => t.date))].sort().reverse();
    
    switch (compareType) {
      case 'days':
        return dates.map(date => ({
          value: date,
          label: format(parseISO(date), 'MMM dd, yyyy')
        }));
      case 'months':
        const months = [...new Set(dates.map(date => format(parseISO(date), 'yyyy-MM')))];
        return months.map(month => ({
          value: month,
          label: format(parseISO(month + '-01'), 'MMMM yyyy')
        }));
      case 'years':
        const years = [...new Set(dates.map(date => format(parseISO(date), 'yyyy')))];
        return years.map(year => ({
          value: year,
          label: year
        }));
      default:
        return [];
    }
  }, [transactions, compareType]);

  // Filter transactions based on period and categories
  const getFilteredTransactions = (period: string) => {
    if (!period) return [];

    let filtered = transactions.filter(t => {
      let matches = false;
      
      switch (compareType) {
        case 'days':
          matches = t.date === period;
          break;
        case 'months':
          matches = format(parseISO(t.date), 'yyyy-MM') === period;
          break;
        case 'years':
          matches = format(parseISO(t.date), 'yyyy') === period;
          break;
      }

      // Apply category filter if selected
      if (selectedCategories.length > 0 && t.category_id) {
        matches = matches && selectedCategories.includes(t.category_id);
      }

      return matches;
    });

    return filtered;
  };

  const leftData = getFilteredTransactions(leftPeriod);
  const rightData = getFilteredTransactions(rightPeriod);

  // Calculate totals for bar chart comparison
  const comparisonData = useMemo(() => {
    const leftExpenses = leftData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const rightExpenses = rightData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return [
      {
        period: leftPeriod ? periodOptions.find(p => p.value === leftPeriod)?.label || leftPeriod : 'Left',
        amount: leftExpenses
      },
      {
        period: rightPeriod ? periodOptions.find(p => p.value === rightPeriod)?.label || rightPeriod : 'Right',
        amount: rightExpenses
      }
    ];
  }, [leftData, rightData, leftPeriod, rightPeriod, periodOptions]);

  // Prepare pie chart data for both periods
  const preparePieData = (data: typeof transactions) => {
    const categoryExpenses = new Map();
    
    data
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
  };

  const leftPieData = preparePieData(leftData);
  const rightPieData = preparePieData(rightData);

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
        <div>
          <h1 className="text-2xl font-bold">Compare Expenses</h1>
          <p className="text-muted-foreground">Analyze your spending patterns</p>
        </div>

        {/* Comparison Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compare By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={compareType === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareType('days')}
              >
                Days
              </Button>
              <Button
                variant={compareType === 'months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareType('months')}
              >
                Months
              </Button>
              <Button
                variant={compareType === 'years' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareType('years')}
              >
                Years
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Period Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Left Period</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={leftPeriod} onValueChange={setLeftPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Right Period</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={rightPeriod} onValueChange={setRightPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter by Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategories([])}
                className="mb-2"
              >
                Clear All
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(category.id)
                          ? prev.filter(id => id !== category.id)
                          : [...prev, category.id]
                      );
                    }}
                    className="justify-start"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Charts */}
        {leftPeriod && rightPeriod && (
          <>
            {/* Total Comparison Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Expenses Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis 
                        dataKey="period" 
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
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Side-by-side Pie Charts */}
            <div className="grid grid-cols-1 gap-4">
              {leftPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {periodOptions.find(p => p.value === leftPeriod)?.label || leftPeriod}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={leftPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {leftPieData.map((entry, index) => (
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

              {rightPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {periodOptions.find(p => p.value === rightPeriod)?.label || rightPeriod}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={rightPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {rightPieData.map((entry, index) => (
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
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}