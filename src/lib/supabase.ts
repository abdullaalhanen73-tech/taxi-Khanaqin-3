import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Types
export interface Passenger {
  id: string;
  phone: string;
  name?: string;
  created_at: string;
}

export interface Driver {
  id: string;
  phone: string;
  name: string;
  car_model: string;
  car_plate: string;
  rating: number;
  total_trips: number;
  balance: number;
  is_online: boolean;
  status: 'pending' | 'approved' | 'rejected';
  is_blocked: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  passenger_id?: string;
  driver_id?: string;
  passenger_phone: string;
  passenger_name?: string;
  driver_name?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  distance_km?: number;
  fare?: number;
  taxi_type: 'normal' | 'super';
  status: 'pending' | 'accepted' | 'arrived' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface RechargeRequest {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  amount: number;
  recharge_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  trip_id: string;
  sender_type: 'driver' | 'passenger';
  sender_id?: string;
  message: string;
  created_at: string;
}

// Driver Constants
export const DRIVER_INITIAL_BALANCE = 5000;
export const TRIP_COMMISSION = 250;
export const BALANCE_BLOCK_THRESHOLD = -5000;
