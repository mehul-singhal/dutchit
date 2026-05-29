export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          upi_id: string | null
          onboarding_complete: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          upi_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          upi_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          category: GroupCategory
          description: string | null
          created_by: string
          invite_code: string
          base_currency: string
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: GroupCategory
          description?: string | null
          created_by: string
          invite_code?: string
          base_currency?: string
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: GroupCategory
          description?: string | null
          created_by?: string
          invite_code?: string
          base_currency?: string
          archived?: boolean
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: MemberRole
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: MemberRole
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: MemberRole
          joined_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          title: string
          amount: number
          currency: string
          inr_amount: number | null
          exchange_rate: number | null
          paid_by: string
          category: ExpenseCategory
          date: string
          notes: string | null
          receipt_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          title: string
          amount: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          paid_by: string
          category: ExpenseCategory
          date: string
          notes?: string | null
          receipt_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          title?: string
          amount?: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          paid_by?: string
          category?: ExpenseCategory
          date?: string
          notes?: string | null
          receipt_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          split_type: SplitType
          amount: number
          percentage: number | null
          shares: number | null
          adjusted_amount: number | null
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          split_type: SplitType
          amount: number
          percentage?: number | null
          shares?: number | null
          adjusted_amount?: number | null
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          split_type?: SplitType
          amount?: number
          percentage?: number | null
          shares?: number | null
          adjusted_amount?: number | null
        }
        Relationships: []
      }
      settlements: {
        Row: {
          id: string
          group_id: string
          paid_by: string
          paid_to: string
          amount: number
          upi_ref: string | null
          payment_app: string | null
          status: SettlementStatus
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          paid_by: string
          paid_to: string
          amount: number
          upi_ref?: string | null
          payment_app?: string | null
          status?: SettlementStatus
          created_at?: string
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          paid_by?: string
          paid_to?: string
          amount?: number
          upi_ref?: string | null
          payment_app?: string | null
          status?: SettlementStatus
          created_at?: string
          confirmed_at?: string | null
        }
        Relationships: []
      }
      personal_expenses: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          currency: string
          inr_amount: number | null
          exchange_rate: number | null
          category: ExpenseCategory
          date: string
          notes: string | null
          paid_from: ExpenseFundingSource | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          category: ExpenseCategory
          date: string
          notes?: string | null
          paid_from?: ExpenseFundingSource | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          category?: ExpenseCategory
          date?: string
          notes?: string | null
          paid_from?: ExpenseFundingSource | null
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: ExpenseCategory
          amount: number
          month: number
          year: number
        }
        Insert: {
          id?: string
          user_id: string
          category: ExpenseCategory
          amount: number
          month: number
          year: number
        }
        Update: {
          id?: string
          user_id?: string
          category?: ExpenseCategory
          amount?: number
          month?: number
          year?: number
        }
        Relationships: []
      }
      personal_income: {
        Row: {
          id: string
          user_id: string
          source: IncomeSource
          title: string
          amount: number
          currency: string
          inr_amount: number | null
          exchange_rate: number | null
          month: number
          year: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source: IncomeSource
          title: string
          amount: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          month: number
          year: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source?: IncomeSource
          title?: string
          amount?: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          month?: number
          year?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      personal_savings: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          currency: string
          inr_amount: number | null
          exchange_rate: number | null
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          currency?: string
          inr_amount?: number | null
          exchange_rate?: number | null
          date?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      personal_finance_settings: {
        Row: {
          user_id: string
          monthly_savings_goal: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          monthly_savings_goal?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          monthly_savings_goal?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type GroupCategory = 'trip' | 'home' | 'couple' | 'friends' | 'work' | 'other'
export type MemberRole = 'admin' | 'member'
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment' | 'settle'
export type SettlementStatus = 'pending_confirmation' | 'confirmed' | 'disputed'
export type ExpenseCategory = 'food' | 'travel' | 'accommodation' | 'entertainment' | 'shopping' | 'utilities' | 'other'
export type ExpenseFundingSource = 'income' | 'savings'
export type IncomeSource = 'salary' | 'freelance' | 'rental' | 'investment' | 'gift' | 'other'

// Joined types
export type UserProfile = Database['public']['Tables']['users']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row'] & {
  user?: UserProfile
}
export type Expense = Database['public']['Tables']['expenses']['Row'] & {
  paid_by_user?: UserProfile
  splits?: ExpenseSplit[]
}
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row'] & {
  user?: UserProfile
}
export type Settlement = Database['public']['Tables']['settlements']['Row'] & {
  paid_by_user?: UserProfile
  paid_to_user?: UserProfile
}
export type PersonalExpense = Database['public']['Tables']['personal_expenses']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type PersonalIncome = Database['public']['Tables']['personal_income']['Row']
export type PersonalSavings = Database['public']['Tables']['personal_savings']['Row']
export type PersonalFinanceSettings = Database['public']['Tables']['personal_finance_settings']['Row']

// UI types
export type Balance = {
  userId: string
  user: UserProfile
  net: number
}

export type DebtSimplification = {
  from: string
  fromUser: UserProfile
  to: string
  toUser: UserProfile
  amount: number
}

export type UpiApp = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic'
