import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'savings_transfer' | 'savings_withdraw';
  amount: number;
  category_id?: string;
  description?: string;
  date: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Balance {
  balance: number;
  savings: number;
}

export function useFinance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [balance, setBalance] = useState<Balance>({ balance: 0, savings: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch user balance
  const fetchBalance = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_balance')
      .select('balance, savings')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching balance:', error);
      return;
    }

    if (data) {
      setBalance({ balance: Number(data.balance), savings: Number(data.savings) });
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, color)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    setTransactions((data || []) as Transaction[]);
  };

  // Update balance
  const updateBalance = async (newBalance: number, newSavings: number) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('user_balance')
      .update({ balance: newBalance, savings: newSavings })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating balance:', error);
      throw error;
    }

    setBalance({ balance: newBalance, savings: newSavings });
  };

  // Add transaction
  const addTransaction = async (
    type: Transaction['type'],
    amount: number,
    categoryId?: string,
    description?: string,
    date?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type,
          amount,
          category_id: categoryId,
          description,
          date: date || new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update balance based on transaction type
      let newBalance = balance.balance;
      let newSavings = balance.savings;

      switch (type) {
        case 'income':
          newBalance += amount;
          break;
        case 'expense':
          newBalance -= amount;
          break;
        case 'savings_transfer':
          newBalance -= amount;
          newSavings += amount;
          break;
        case 'savings_withdraw':
          newBalance += amount;
          newSavings -= amount;
          break;
      }

      await updateBalance(newBalance, newSavings);
      await fetchTransactions();

      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Add category
  const addCategory = async (name: string, color: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name,
          color
        });

      if (error) throw error;

      await fetchCategories();
      toast({
        title: "Category added",
        description: `${name} category has been created.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Delete transaction
  const deleteTransaction = async (transactionId: string, transaction: Transaction) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Reverse the balance changes
      let newBalance = balance.balance;
      let newSavings = balance.savings;

      switch (transaction.type) {
        case 'income':
          newBalance -= transaction.amount;
          break;
        case 'expense':
          newBalance += transaction.amount;
          break;
        case 'savings_transfer':
          newBalance += transaction.amount;
          newSavings -= transaction.amount;
          break;
        case 'savings_withdraw':
          newBalance -= transaction.amount;
          newSavings += transaction.amount;
          break;
      }

      await updateBalance(newBalance, newSavings);
      await fetchTransactions();

      toast({
        title: "Transaction deleted",
        description: "The transaction has been removed."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchBalance(),
        fetchCategories(),
        fetchTransactions()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  return {
    transactions,
    categories,
    balance,
    loading,
    addTransaction,
    addCategory,
    deleteTransaction,
    fetchTransactions,
    fetchCategories,
    fetchBalance
  };
}